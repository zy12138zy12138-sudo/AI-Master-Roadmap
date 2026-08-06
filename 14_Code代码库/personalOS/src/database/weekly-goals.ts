import type { SQLiteDatabase } from 'expo-sqlite';

import { PERSONAL_OS_PROJECT_ID } from '@/src/database/migrations';
import { getLocalDateFromKey, isLocalDateKey } from '@/src/utils/local-date';

export const MAX_WEEKLY_GOAL_LENGTH = 300;

export type PersonalOsWeeklyGoal = {
  id: string;
  projectId: string;
  weekStartDate: string;
  goalText: string;
  createdAt: string;
  updatedAt: string;
};

type WeeklyGoalRow = {
  id: string;
  project_id: string;
  week_start_date: string;
  goal_text: string;
  created_at: string;
  updated_at: string;
};

function assertWeekStartDate(weekStartDate: string): void {
  if (!isLocalDateKey(weekStartDate) || getLocalDateFromKey(weekStartDate).getDay() !== 1) {
    throw new Error(`周开始日期无效：${weekStartDate}`);
  }
}

function normalizeGoalText(goalText: string): string {
  const normalizedGoalText = goalText.trim();

  if (normalizedGoalText.length === 0) {
    throw new Error('本周目标不能为空。');
  }

  if (normalizedGoalText.length > MAX_WEEKLY_GOAL_LENGTH) {
    throw new Error(`本周目标不能超过 ${MAX_WEEKLY_GOAL_LENGTH} 个字符。`);
  }

  return normalizedGoalText;
}

function mapWeeklyGoalRow(row: WeeklyGoalRow): PersonalOsWeeklyGoal {
  return {
    id: row.id,
    projectId: row.project_id,
    weekStartDate: row.week_start_date,
    goalText: row.goal_text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getPersonalOsWeeklyGoal(
  db: SQLiteDatabase,
  weekStartDate: string,
): Promise<PersonalOsWeeklyGoal | null> {
  assertWeekStartDate(weekStartDate);

  const row = await db.getFirstAsync<WeeklyGoalRow>(
    `SELECT
      id,
      project_id,
      week_start_date,
      goal_text,
      created_at,
      updated_at
     FROM weekly_goals
     WHERE project_id = ?
       AND week_start_date = ?`,
    PERSONAL_OS_PROJECT_ID,
    weekStartDate,
  );

  return row ? mapWeeklyGoalRow(row) : null;
}

export async function savePersonalOsWeeklyGoal(
  db: SQLiteDatabase,
  weekStartDate: string,
  goalText: string,
): Promise<void> {
  assertWeekStartDate(weekStartDate);
  const normalizedGoalText = normalizeGoalText(goalText);
  const timestamp = new Date().toISOString();
  const result = await db.runAsync(
    `INSERT INTO weekly_goals (
      id,
      project_id,
      week_start_date,
      goal_text,
      created_at,
      updated_at
    ) VALUES ('weekly-goal-' || lower(hex(randomblob(16))), ?, ?, ?, ?, ?)
    ON CONFLICT(project_id, week_start_date) DO UPDATE SET
      goal_text = excluded.goal_text,
      updated_at = excluded.updated_at`,
    PERSONAL_OS_PROJECT_ID,
    weekStartDate,
    normalizedGoalText,
    timestamp,
    timestamp,
  );

  if (result.changes !== 1) {
    throw new Error('本周目标未能保存。');
  }
}

export async function deletePersonalOsWeeklyGoal(
  db: SQLiteDatabase,
  weekStartDate: string,
): Promise<void> {
  assertWeekStartDate(weekStartDate);

  const result = await db.runAsync(
    `DELETE FROM weekly_goals
     WHERE project_id = ?
       AND week_start_date = ?`,
    PERSONAL_OS_PROJECT_ID,
    weekStartDate,
  );

  if (result.changes !== 1) {
    throw new Error('未找到需要删除的本周目标。');
  }
}
