import type { SQLiteDatabase } from 'expo-sqlite';

import { PERSONAL_OS_PROJECT_ID } from '@/src/database/migrations';
import { isLocalDateKey } from '@/src/utils/local-date';

export type TaskPriority = 'P0' | 'P1';

export const MAX_TASK_TITLE_LENGTH = 100;

export type PersonalOsTask = {
  id: string;
  projectId: string | null;
  title: string;
  priority: TaskPriority;
  completed: boolean;
  scheduledDate: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type TaskEditorValues = {
  title: string;
  priority: TaskPriority;
};

type TaskRow = {
  id: string;
  project_id: string | null;
  title: string;
  priority: TaskPriority;
  completed: number;
  scheduled_date: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type GeneratedTaskIDRow = {
  id: string;
};

type NextSortOrderRow = {
  next_sort_order: number;
};

function normalizeTaskTitle(title: string): string {
  const normalizedTitle = title.trim();

  if (normalizedTitle.length === 0) {
    throw new Error('任务标题不能为空。');
  }

  if (normalizedTitle.length > MAX_TASK_TITLE_LENGTH) {
    throw new Error(`任务标题不能超过 ${MAX_TASK_TITLE_LENGTH} 个字符。`);
  }

  return normalizedTitle;
}

function assertTaskPriority(priority: TaskPriority): void {
  if (priority !== 'P0' && priority !== 'P1') {
    throw new Error('任务优先级必须是 P0 或 P1。');
  }
}

function assertLocalDateKey(dateKey: string): void {
  if (!isLocalDateKey(dateKey)) {
    throw new Error(`任务日期格式无效：${dateKey}`);
  }
}

function mapTaskRow(row: TaskRow): PersonalOsTask {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    priority: row.priority,
    completed: row.completed === 1,
    scheduledDate: row.scheduled_date,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getPersonalOsTasks(
  db: SQLiteDatabase,
  scheduledDate: string,
): Promise<PersonalOsTask[]> {
  assertLocalDateKey(scheduledDate);

  const rows = await db.getAllAsync<TaskRow>(
    `SELECT
      id,
      project_id,
      title,
      priority,
      completed,
      scheduled_date,
      sort_order,
      created_at,
      updated_at
     FROM tasks
     WHERE project_id = ?
       AND scheduled_date = ?
     ORDER BY sort_order ASC`,
    PERSONAL_OS_PROJECT_ID,
    scheduledDate,
  );

  return rows.map(mapTaskRow);
}

export async function createPersonalOsTask(
  db: SQLiteDatabase,
  values: TaskEditorValues,
  scheduledDate: string,
): Promise<string> {
  const title = normalizeTaskTitle(values.title);
  assertTaskPriority(values.priority);
  assertLocalDateKey(scheduledDate);

  let createdTaskID: string | null = null;

  await db.withExclusiveTransactionAsync(async (txn) => {
    const idRow = await txn.getFirstAsync<GeneratedTaskIDRow>(
      `SELECT 'task-' || lower(hex(randomblob(16))) AS id`,
    );
    const sortOrderRow = await txn.getFirstAsync<NextSortOrderRow>(
      `SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_sort_order
       FROM tasks
       WHERE project_id = ?
         AND scheduled_date = ?`,
      PERSONAL_OS_PROJECT_ID,
      scheduledDate,
    );

    if (!idRow?.id || !sortOrderRow) {
      throw new Error('无法生成新任务的本地标识或排序。');
    }

    const timestamp = new Date().toISOString();
    const result = await txn.runAsync(
      `INSERT INTO tasks (
        id,
        project_id,
        title,
        priority,
        completed,
        scheduled_date,
        sort_order,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      idRow.id,
      PERSONAL_OS_PROJECT_ID,
      title,
      values.priority,
      0,
      scheduledDate,
      sortOrderRow.next_sort_order,
      timestamp,
      timestamp,
    );

    if (result.changes !== 1) {
      throw new Error('新任务未能写入数据库。');
    }

    createdTaskID = idRow.id;
  });

  if (!createdTaskID) {
    throw new Error('新任务创建失败。');
  }

  return createdTaskID;
}

export async function updatePersonalOsTask(
  db: SQLiteDatabase,
  taskID: string,
  values: TaskEditorValues,
): Promise<string> {
  const title = normalizeTaskTitle(values.title);
  assertTaskPriority(values.priority);
  const updatedAt = new Date().toISOString();
  const result = await db.runAsync(
    `UPDATE tasks
     SET title = ?, priority = ?, updated_at = ?
     WHERE id = ? AND project_id = ?`,
    title,
    values.priority,
    updatedAt,
    taskID,
    PERSONAL_OS_PROJECT_ID,
  );

  if (result.changes !== 1) {
    throw new Error(`未找到需要编辑的任务：${taskID}`);
  }

  return updatedAt;
}

export async function deletePersonalOsTask(
  db: SQLiteDatabase,
  taskID: string,
): Promise<void> {
  const result = await db.runAsync(
    `DELETE FROM tasks
     WHERE id = ? AND project_id = ?`,
    taskID,
    PERSONAL_OS_PROJECT_ID,
  );

  if (result.changes !== 1) {
    throw new Error(`未找到需要删除的任务：${taskID}`);
  }
}

export async function updateTaskCompleted(
  db: SQLiteDatabase,
  taskID: string,
  completed: boolean,
): Promise<string> {
  const updatedAt = new Date().toISOString();
  const result = await db.runAsync(
    `UPDATE tasks
     SET completed = ?, updated_at = ?
     WHERE id = ? AND project_id = ?`,
    completed ? 1 : 0,
    updatedAt,
    taskID,
    PERSONAL_OS_PROJECT_ID,
  );

  if (result.changes !== 1) {
    throw new Error(`未找到需要更新的任务：${taskID}`);
  }

  return updatedAt;
}
