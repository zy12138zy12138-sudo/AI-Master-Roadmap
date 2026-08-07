import type { SQLiteDatabase } from 'expo-sqlite';

import { getLocalDateKey } from '@/src/utils/local-date';

export const DATABASE_NAME = 'personal-os.db';
export const DATABASE_VERSION = 5;
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

type RowCount = {
  count: number;
};

type ForeignKeyViolation = {
  table: string;
  rowid: number;
  parent: string;
  fkid: number;
};

type TableInfoRow = {
  name: string;
  type: string;
  notnull: number;
  pk: number;
};

type IndexListRow = {
  name: string;
  unique: number;
};

type IndexInfoRow = {
  seqno: number;
  name: string;
};

type ForeignKeyListRow = {
  table: string;
  from: string;
  to: string;
  on_update: string;
  on_delete: string;
};

async function migrateFromVersion0To1(db: SQLiteDatabase): Promise<void> {
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

async function migrateFromVersion1To2(db: SQLiteDatabase): Promise<void> {
  const migrationDate = getLocalDateKey();

  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_tasks_project_date_sort
        ON tasks(project_id, scheduled_date, sort_order);
    `);

    for (const task of SEED_TASKS) {
      await txn.runAsync(
        `UPDATE tasks
         SET scheduled_date = ?
         WHERE id = ? AND scheduled_date IS NULL`,
        migrationDate,
        task.id,
      );
    }

    await txn.execAsync('PRAGMA user_version = 2;');
  });
}

async function migrateFromVersion2To3(db: SQLiteDatabase): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    const beforeMigration = await txn.getFirstAsync<RowCount>(
      'SELECT COUNT(*) AS count FROM tasks',
    );

    if (!beforeMigration) {
      throw new Error('升级数据库前无法读取任务数量。');
    }

    await txn.execAsync(`
      CREATE TABLE tasks_v3 (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        title TEXT NOT NULL,
        priority TEXT NOT NULL CHECK (priority IN ('P0', 'P1', 'P2', 'P3')),
        completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
        scheduled_date TEXT,
        sort_order INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id)
          ON UPDATE CASCADE
          ON DELETE SET NULL
      );

      INSERT INTO tasks_v3 (
        id,
        project_id,
        title,
        priority,
        completed,
        scheduled_date,
        sort_order,
        created_at,
        updated_at
      )
      SELECT
        id,
        project_id,
        title,
        priority,
        completed,
        scheduled_date,
        sort_order,
        created_at,
        updated_at
      FROM tasks;

      DROP TABLE tasks;
      ALTER TABLE tasks_v3 RENAME TO tasks;

      CREATE INDEX IF NOT EXISTS idx_tasks_project_sort
        ON tasks(project_id, sort_order);

      CREATE INDEX IF NOT EXISTS idx_tasks_project_date_sort
        ON tasks(project_id, scheduled_date, sort_order);
    `);

    const afterMigration = await txn.getFirstAsync<RowCount>(
      'SELECT COUNT(*) AS count FROM tasks',
    );

    if (!afterMigration || afterMigration.count !== beforeMigration.count) {
      throw new Error('数据库升级后的任务数量与升级前不一致。');
    }

    const foreignKeyViolations = await txn.getAllAsync<ForeignKeyViolation>(
      'PRAGMA foreign_key_check(tasks)',
    );

    if (foreignKeyViolations.length > 0) {
      throw new Error('数据库升级后检测到任务项目关系异常。');
    }

    await txn.execAsync('PRAGMA user_version = 3;');
  });
}

async function migrateFromVersion3To4(db: SQLiteDatabase): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.execAsync(`
      CREATE TABLE IF NOT EXISTS weekly_goals (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        week_start_date TEXT NOT NULL,
        goal_text TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id)
          ON UPDATE CASCADE
          ON DELETE CASCADE
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_goals_project_week
        ON weekly_goals(project_id, week_start_date);
    `);

    const foreignKeyViolations = await txn.getAllAsync<ForeignKeyViolation>(
      'PRAGMA foreign_key_check(weekly_goals)',
    );

    if (foreignKeyViolations.length > 0) {
      throw new Error('数据库升级后检测到周目标项目关系异常。');
    }

    await txn.execAsync('PRAGMA user_version = 4;');
  });
}

async function migrateFromVersion4To5(db: SQLiteDatabase): Promise<void> {
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.execAsync(`
      CREATE TABLE IF NOT EXISTS daily_reviews (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        review_date TEXT NOT NULL,
        self_score INTEGER NOT NULL CHECK (self_score BETWEEN 1 AND 10),
        unfinished_reason TEXT NOT NULL,
        obstacle TEXT NOT NULL,
        best_thing TEXT NOT NULL,
        tomorrow_action TEXT NOT NULL,
        notes TEXT NOT NULL,
        task_total INTEGER NOT NULL CHECK (task_total >= 0),
        completed_task_count INTEGER NOT NULL CHECK (completed_task_count >= 0),
        incomplete_task_count INTEGER NOT NULL CHECK (incomplete_task_count >= 0),
        priority_task_total INTEGER NOT NULL CHECK (priority_task_total >= 0),
        completed_priority_task_count INTEGER NOT NULL
          CHECK (completed_priority_task_count >= 0),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        CHECK (task_total = completed_task_count + incomplete_task_count),
        CHECK (priority_task_total <= task_total),
        CHECK (completed_priority_task_count <= priority_task_total),
        FOREIGN KEY (project_id) REFERENCES projects(id)
          ON UPDATE CASCADE
          ON DELETE CASCADE
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_reviews_project_date
        ON daily_reviews(project_id, review_date);
    `);

    const expectedColumns: Record<
      string,
      { type: 'TEXT' | 'INTEGER'; notNull: boolean; primaryKey: boolean }
    > = {
      id: { type: 'TEXT', notNull: false, primaryKey: true },
      project_id: { type: 'TEXT', notNull: true, primaryKey: false },
      review_date: { type: 'TEXT', notNull: true, primaryKey: false },
      self_score: { type: 'INTEGER', notNull: true, primaryKey: false },
      unfinished_reason: { type: 'TEXT', notNull: true, primaryKey: false },
      obstacle: { type: 'TEXT', notNull: true, primaryKey: false },
      best_thing: { type: 'TEXT', notNull: true, primaryKey: false },
      tomorrow_action: { type: 'TEXT', notNull: true, primaryKey: false },
      notes: { type: 'TEXT', notNull: true, primaryKey: false },
      task_total: { type: 'INTEGER', notNull: true, primaryKey: false },
      completed_task_count: { type: 'INTEGER', notNull: true, primaryKey: false },
      incomplete_task_count: { type: 'INTEGER', notNull: true, primaryKey: false },
      priority_task_total: { type: 'INTEGER', notNull: true, primaryKey: false },
      completed_priority_task_count: {
        type: 'INTEGER',
        notNull: true,
        primaryKey: false,
      },
      created_at: { type: 'TEXT', notNull: true, primaryKey: false },
      updated_at: { type: 'TEXT', notNull: true, primaryKey: false },
    };
    const tableInfo = await txn.getAllAsync<TableInfoRow>('PRAGMA table_info(daily_reviews)');
    const columnsAreValid =
      tableInfo.length === Object.keys(expectedColumns).length &&
      tableInfo.every((column) => {
        const expectedColumn = expectedColumns[column.name];

        return (
          expectedColumn !== undefined &&
          column.type.toUpperCase() === expectedColumn.type &&
          (column.notnull === 1) === expectedColumn.notNull &&
          (column.pk === 1) === expectedColumn.primaryKey
        );
      });

    if (!columnsAreValid) {
      throw new Error('每日复盘表字段校验失败。');
    }

    const indexes = await txn.getAllAsync<IndexListRow>('PRAGMA index_list(daily_reviews)');
    const hasUniqueProjectDateIndex = indexes.some(
      (index) => index.name === 'idx_daily_reviews_project_date' && index.unique === 1,
    );

    if (!hasUniqueProjectDateIndex) {
      throw new Error('每日复盘项目日期唯一索引校验失败。');
    }

    const uniqueIndexColumns = await txn.getAllAsync<IndexInfoRow>(
      'PRAGMA index_info(idx_daily_reviews_project_date)',
    );
    const orderedIndexColumns = uniqueIndexColumns
      .sort((left, right) => left.seqno - right.seqno)
      .map((column) => column.name);

    if (
      orderedIndexColumns.length !== 2 ||
      orderedIndexColumns[0] !== 'project_id' ||
      orderedIndexColumns[1] !== 'review_date'
    ) {
      throw new Error('每日复盘项目日期唯一索引字段校验失败。');
    }

    const foreignKeys = await txn.getAllAsync<ForeignKeyListRow>(
      'PRAGMA foreign_key_list(daily_reviews)',
    );
    const hasProjectForeignKey = foreignKeys.some(
      (foreignKey) =>
        foreignKey.table === 'projects' &&
        foreignKey.from === 'project_id' &&
        foreignKey.to === 'id' &&
        foreignKey.on_update.toUpperCase() === 'CASCADE' &&
        foreignKey.on_delete.toUpperCase() === 'CASCADE',
    );

    if (!hasProjectForeignKey) {
      throw new Error('每日复盘项目外键校验失败。');
    }

    const foreignKeyViolations = await txn.getAllAsync<ForeignKeyViolation>(
      'PRAGMA foreign_key_check(daily_reviews)',
    );

    if (foreignKeyViolations.length > 0) {
      throw new Error('数据库升级后检测到每日复盘项目关系异常。');
    }

    await txn.execAsync('PRAGMA user_version = 5;');
  });
}

export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const versionRow = await db.getFirstAsync<UserVersionRow>('PRAGMA user_version');
  let currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion > DATABASE_VERSION) {
    throw new Error(
      `数据库版本 ${currentVersion} 高于应用支持的版本 ${DATABASE_VERSION}。`,
    );
  }

  if (currentVersion === 0) {
    await migrateFromVersion0To1(db);
    currentVersion = 1;
  }

  if (currentVersion === 1) {
    await migrateFromVersion1To2(db);
    currentVersion = 2;
  }

  if (currentVersion === 2) {
    await migrateFromVersion2To3(db);
    currentVersion = 3;
  }

  if (currentVersion === 3) {
    await migrateFromVersion3To4(db);
    currentVersion = 4;
  }

  if (currentVersion === 4) {
    await migrateFromVersion4To5(db);
    currentVersion = 5;
  }

  if (currentVersion !== DATABASE_VERSION) {
    throw new Error(`暂不支持从数据库版本 ${currentVersion} 迁移。`);
  }
}
