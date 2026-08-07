import type { SQLiteDatabase } from 'expo-sqlite';

import { PERSONAL_OS_PROJECT_ID } from '@/src/database/migrations';
import { isLocalDateKey } from '@/src/utils/local-date';

export const DEFAULT_DAILY_REVIEW_SCORE = 5;
export const MAX_DAILY_REVIEW_TEXT_LENGTH = 500;
export const MAX_DAILY_REVIEW_NOTES_LENGTH = 1000;

export type DailyReviewFormValues = {
  selfScore: number;
  unfinishedReason: string;
  obstacle: string;
  bestThing: string;
  tomorrowAction: string;
  notes: string;
};

export type DailyTaskStats = {
  taskTotal: number;
  completedTaskCount: number;
  incompleteTaskCount: number;
  priorityTaskTotal: number;
  completedPriorityTaskCount: number;
};

export type PersonalOsDailyReview = DailyReviewFormValues &
  DailyTaskStats & {
    id: string;
    projectId: string;
    reviewDate: string;
    createdAt: string;
    updatedAt: string;
  };

export type DailyReviewPageData = {
  review: PersonalOsDailyReview | null;
  taskStats: DailyTaskStats;
  taskStatsSource: 'live' | 'snapshot';
};

type DailyReviewRow = {
  id: string;
  project_id: string;
  review_date: string;
  self_score: number;
  unfinished_reason: string;
  obstacle: string;
  best_thing: string;
  tomorrow_action: string;
  notes: string;
  task_total: number;
  completed_task_count: number;
  incomplete_task_count: number;
  priority_task_total: number;
  completed_priority_task_count: number;
  created_at: string;
  updated_at: string;
};

type DailyTaskStatsRow = {
  task_total: number;
  completed_task_count: number;
  incomplete_task_count: number;
  priority_task_total: number;
  completed_priority_task_count: number;
};

function assertReviewDate(reviewDate: string): void {
  if (!isLocalDateKey(reviewDate)) {
    throw new Error(`复盘日期无效：${reviewDate}`);
  }
}

function normalizeReviewText(value: string, fieldName: string, maxLength: number): string {
  const normalizedValue = value.trim();

  if (normalizedValue.length > maxLength) {
    throw new Error(`${fieldName}不能超过 ${maxLength} 个字符。`);
  }

  return normalizedValue;
}

function normalizeReviewValues(values: DailyReviewFormValues): DailyReviewFormValues {
  if (!Number.isInteger(values.selfScore) || values.selfScore < 1 || values.selfScore > 10) {
    throw new Error('自评分必须是 1—10 的整数。');
  }

  return {
    selfScore: values.selfScore,
    unfinishedReason: normalizeReviewText(
      values.unfinishedReason,
      '主要未完成原因',
      MAX_DAILY_REVIEW_TEXT_LENGTH,
    ),
    obstacle: normalizeReviewText(
      values.obstacle,
      '具体执行阻碍',
      MAX_DAILY_REVIEW_TEXT_LENGTH,
    ),
    bestThing: normalizeReviewText(
      values.bestThing,
      '今日最好的一件事',
      MAX_DAILY_REVIEW_TEXT_LENGTH,
    ),
    tomorrowAction: normalizeReviewText(
      values.tomorrowAction,
      '明日改进行动',
      MAX_DAILY_REVIEW_TEXT_LENGTH,
    ),
    notes: normalizeReviewText(values.notes, '补充说明', MAX_DAILY_REVIEW_NOTES_LENGTH),
  };
}

function mapDailyTaskStats(row: DailyTaskStatsRow): DailyTaskStats {
  return {
    taskTotal: row.task_total,
    completedTaskCount: row.completed_task_count,
    incompleteTaskCount: row.incomplete_task_count,
    priorityTaskTotal: row.priority_task_total,
    completedPriorityTaskCount: row.completed_priority_task_count,
  };
}

function mapDailyReviewRow(row: DailyReviewRow): PersonalOsDailyReview {
  return {
    id: row.id,
    projectId: row.project_id,
    reviewDate: row.review_date,
    selfScore: row.self_score,
    unfinishedReason: row.unfinished_reason,
    obstacle: row.obstacle,
    bestThing: row.best_thing,
    tomorrowAction: row.tomorrow_action,
    notes: row.notes,
    taskTotal: row.task_total,
    completedTaskCount: row.completed_task_count,
    incompleteTaskCount: row.incomplete_task_count,
    priorityTaskTotal: row.priority_task_total,
    completedPriorityTaskCount: row.completed_priority_task_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getDailyTaskStats(
  db: SQLiteDatabase,
  reviewDate: string,
): Promise<DailyTaskStats> {
  const row = await db.getFirstAsync<DailyTaskStatsRow>(
    `SELECT
      COUNT(*) AS task_total,
      COALESCE(SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END), 0)
        AS completed_task_count,
      COALESCE(SUM(CASE WHEN completed = 0 THEN 1 ELSE 0 END), 0)
        AS incomplete_task_count,
      COALESCE(SUM(CASE WHEN priority IN ('P0', 'P1') THEN 1 ELSE 0 END), 0)
        AS priority_task_total,
      COALESCE(SUM(
        CASE WHEN priority IN ('P0', 'P1') AND completed = 1 THEN 1 ELSE 0 END
      ), 0) AS completed_priority_task_count
     FROM tasks
     WHERE project_id = ?
       AND scheduled_date = ?`,
    PERSONAL_OS_PROJECT_ID,
    reviewDate,
  );

  if (!row) {
    throw new Error('无法读取该日期的任务统计。');
  }

  return mapDailyTaskStats(row);
}

async function getDailyReviewRow(
  db: SQLiteDatabase,
  reviewDate: string,
): Promise<PersonalOsDailyReview | null> {
  const row = await db.getFirstAsync<DailyReviewRow>(
    `SELECT
      id,
      project_id,
      review_date,
      self_score,
      unfinished_reason,
      obstacle,
      best_thing,
      tomorrow_action,
      notes,
      task_total,
      completed_task_count,
      incomplete_task_count,
      priority_task_total,
      completed_priority_task_count,
      created_at,
      updated_at
     FROM daily_reviews
     WHERE project_id = ?
       AND review_date = ?`,
    PERSONAL_OS_PROJECT_ID,
    reviewDate,
  );

  return row ? mapDailyReviewRow(row) : null;
}

export function getTaskCompletionRate(taskStats: DailyTaskStats): number {
  if (taskStats.taskTotal === 0) {
    return 0;
  }

  return Math.round((taskStats.completedTaskCount / taskStats.taskTotal) * 100);
}

export async function getPersonalOsDailyReviewPageData(
  db: SQLiteDatabase,
  reviewDate: string,
): Promise<DailyReviewPageData> {
  assertReviewDate(reviewDate);
  const review = await getDailyReviewRow(db, reviewDate);

  if (review) {
    return {
      review,
      taskStats: {
        taskTotal: review.taskTotal,
        completedTaskCount: review.completedTaskCount,
        incompleteTaskCount: review.incompleteTaskCount,
        priorityTaskTotal: review.priorityTaskTotal,
        completedPriorityTaskCount: review.completedPriorityTaskCount,
      },
      taskStatsSource: 'snapshot',
    };
  }

  return {
    review: null,
    taskStats: await getDailyTaskStats(db, reviewDate),
    taskStatsSource: 'live',
  };
}

export async function savePersonalOsDailyReview(
  db: SQLiteDatabase,
  reviewDate: string,
  values: DailyReviewFormValues,
): Promise<PersonalOsDailyReview> {
  assertReviewDate(reviewDate);
  const normalizedValues = normalizeReviewValues(values);
  let savedReview: PersonalOsDailyReview | null = null;

  await db.withExclusiveTransactionAsync(async (txn) => {
    const taskStats = await getDailyTaskStats(txn, reviewDate);
    const timestamp = new Date().toISOString();
    const result = await txn.runAsync(
      `INSERT INTO daily_reviews (
        id,
        project_id,
        review_date,
        self_score,
        unfinished_reason,
        obstacle,
        best_thing,
        tomorrow_action,
        notes,
        task_total,
        completed_task_count,
        incomplete_task_count,
        priority_task_total,
        completed_priority_task_count,
        created_at,
        updated_at
      ) VALUES (
        'daily-review-' || lower(hex(randomblob(16))),
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
      ON CONFLICT(project_id, review_date) DO UPDATE SET
        self_score = excluded.self_score,
        unfinished_reason = excluded.unfinished_reason,
        obstacle = excluded.obstacle,
        best_thing = excluded.best_thing,
        tomorrow_action = excluded.tomorrow_action,
        notes = excluded.notes,
        updated_at = excluded.updated_at`,
      PERSONAL_OS_PROJECT_ID,
      reviewDate,
      normalizedValues.selfScore,
      normalizedValues.unfinishedReason,
      normalizedValues.obstacle,
      normalizedValues.bestThing,
      normalizedValues.tomorrowAction,
      normalizedValues.notes,
      taskStats.taskTotal,
      taskStats.completedTaskCount,
      taskStats.incompleteTaskCount,
      taskStats.priorityTaskTotal,
      taskStats.completedPriorityTaskCount,
      timestamp,
      timestamp,
    );

    if (result.changes !== 1) {
      throw new Error('每日复盘未能保存。');
    }

    savedReview = await getDailyReviewRow(txn, reviewDate);

    if (!savedReview) {
      throw new Error('每日复盘保存后无法重新读取。');
    }
  });

  if (!savedReview) {
    throw new Error('每日复盘保存失败。');
  }

  return savedReview;
}
