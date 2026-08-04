import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'personal-os.db';
export const DATABASE_VERSION = 1;
export const PERSONAL_OS_PROJECT_ID = 'project-personal-os-mvp';

type SeedTask = {
  id: string;
  title: string;
  priority: 'P0' | 'P1';
  sortOrder: number;
};

const SEED_TASKS: SeedTask[] = [
  {
    id: 'task-check-windows-environment',
    title: '检查 Windows 开发环境',
    priority: 'P0',
    sortOrder: 1,
  },
  {
    id: 'task-create-personal-os-expo-project',
    title: '创建 Personal OS Expo 项目',
    priority: 'P0',
    sortOrder: 2,
  },
  {
    id: 'task-run-on-iphone-expo-go',
    title: '在 iPhone Expo Go 中运行',
    priority: 'P0',
    sortOrder: 3,
  },
  {
    id: 'task-complete-four-bottom-tabs',
    title: '完成4个底部导航',
    priority: 'P1',
    sortOrder: 4,
  },
  {
    id: 'task-complete-day-1-acceptance',
    title: '完成 Day 1验收',
    priority: 'P1',
    sortOrder: 5,
  },
];

type UserVersionRow = {
  user_version: number;
};

export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const versionRow = await db.getFirstAsync<UserVersionRow>('PRAGMA user_version');
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion > DATABASE_VERSION) {
    throw new Error(
      `数据库版本 ${currentVersion} 高于应用支持的版本 ${DATABASE_VERSION}。`,
    );
  }

  if (currentVersion === DATABASE_VERSION) {
    return;
  }

  if (currentVersion !== 0) {
    throw new Error(`暂不支持从数据库版本 ${currentVersion} 迁移。`);
  }

  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.execAsync(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        title TEXT NOT NULL,
        priority TEXT NOT NULL CHECK (priority IN ('P0', 'P1')),
        completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
        scheduled_date TEXT,
        sort_order INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id)
          ON UPDATE CASCADE
          ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_project_sort
        ON tasks(project_id, sort_order);
    `);

    const timestamp = new Date().toISOString();

    await txn.runAsync(
      `INSERT OR IGNORE INTO projects (id, name, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      PERSONAL_OS_PROJECT_ID,
      'Personal OS MVP',
      'active',
      timestamp,
      timestamp,
    );

    for (const task of SEED_TASKS) {
      await txn.runAsync(
        `INSERT OR IGNORE INTO tasks (
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
        task.id,
        PERSONAL_OS_PROJECT_ID,
        task.title,
        task.priority,
        0,
        null,
        task.sortOrder,
        timestamp,
        timestamp,
      );
    }

    await txn.execAsync('PRAGMA user_version = 1;');
  });
}
