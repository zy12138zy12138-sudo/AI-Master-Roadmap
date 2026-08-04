import type { SQLiteDatabase } from 'expo-sqlite';

import { PERSONAL_OS_PROJECT_ID } from '@/src/database/migrations';

export type TaskPriority = 'P0' | 'P1';

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

export async function getPersonalOsTasks(db: SQLiteDatabase): Promise<PersonalOsTask[]> {
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
     ORDER BY sort_order ASC`,
    PERSONAL_OS_PROJECT_ID,
  );

  return rows.map((row) => ({
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    priority: row.priority,
    completed: row.completed === 1,
    scheduledDate: row.scheduled_date,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
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
