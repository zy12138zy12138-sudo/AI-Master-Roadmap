# Personal OS MVP｜Day 2 V1.1 详细执行步骤

> 目标：建立“项目—任务”最小本地数据库，让“今日”页面的任务完成状态在 Reload 和完全关闭 Expo Go 后仍然保留。

## 一、Day 2 最终成果

完成 Day 2 后，Personal OS 应具备：

- 使用 `expo-sqlite` 在 iPhone 本地保存数据；
- 建立 `projects` 与 `tasks` 两张表；
- 初始化一个“Personal OS MVP”项目；
- 初始化 5 条固定开发任务；
- “今日”页从 SQLite 读取任务；
- 点击任务可以切换完成状态；
- Reload 和完全关闭 Expo Go 后，完成状态仍然保留；
- 多次启动不会重复生成项目或任务；
- Day 1 的页面、样式及四个底部导航保持不变。

Day 2 最关键的验收证据：

> 将第 1 条和第 4 条任务设为完成后，Reload 和完全关闭 Expo Go 再打开，完成状态仍然保留，并且任务始终只有 5 条。

---

## 二、当前项目环境

### 1. 项目目录

```text
E:\AI-Master-Roadmap\14_Code代码库\personalOS
```

### 2. Git 仓库根目录

```text
E:\AI-Master-Roadmap
```

### 3. 技术栈

- Windows；
- VS Code；
- Expo SDK 54；
- React Native；
- TypeScript；
- Expo Router；
- iPhone Expo Go；
- 手机本地 SQLite；
- 不使用服务器、登录、云同步或 AI API。

### 4. Day 2 固定执行顺序

```text
工作区检查
→ Codex只读检查
→ 安装expo-sqlite
→ Codex正式开发
→ 代码检查
→ iPhone持久化验收
→ Git提交与推送
```

---

## 三、开始前检查工作区

### 1. 打开项目

在 VS Code 中打开：

```text
E:\AI-Master-Roadmap\14_Code代码库\personalOS
```

### 2. 打开 PowerShell 终端

执行：

```powershell
Set-Location -LiteralPath 'E:\AI-Master-Roadmap\14_Code代码库\personalOS'

git status
git log --oneline -5
```

确认：

- 当前位于正确项目目录；
- 当前分支为 `main`；
- 没有未确认的代码修改；
- 如果本地领先远端若干提交，可以继续开发；
- 记录已有的用户修改，不得覆盖或恢复。

当前已知的无关修改：

```text
../../.obsidian/workspace.json
```

该文件通常由 Obsidian 自动更新，与 Day 2 无关。不要修改、恢复、删除或加入本次 Git 提交。

---

## 四、让 Codex 进行只读检查

在 VS Code 的 Codex 对话框中提出只读检查要求，检查范围至少包括：

- 项目根目录与 Git 状态；
- `package.json` 中 Expo、Expo Router 和 SQLite 状态；
- `app/_layout.tsx` 的 Provider 结构；
- `app/(tabs)/index.tsx` 的任务类型和状态管理方式；
- 项目中的 `AGENTS.md`；
- 适合接入 `SQLiteProvider` 的位置；
- 推荐新增或修改的文件；
- 现有持久化方案是否存在冲突；
- TypeScript 和 ESLint 基线是否通过。

只读检查阶段禁止：

- 修改、创建或删除文件；
- 安装依赖；
- 执行 Git 提交或推送；
- 重建项目或升级 Expo。

当前已确认的只读检查结论：

- Day 1 的任务仅保存在页面内存中；
- Reload 后会恢复默认状态；
- 项目此前没有 SQLite 或 AsyncStorage；
- 适合在根布局中接入 `SQLiteProvider`；
- 应把迁移与任务访问逻辑放入 `src/database/`；
- 正式开发前需安装与 Expo SDK 54 匹配的 `expo-sqlite`。

---

## 五、安装 expo-sqlite

### 1. 确认 Metro 已停止

如果终端正在运行 Expo，终端底部不会出现普通 PowerShell 提示符。先点击该终端并按：

```text
Ctrl + C
```

如果询问是否终止，输入：

```text
Y
```

看到以下形式的提示符后再继续：

```text
PS E:\AI-Master-Roadmap\14_Code代码库\personalOS>
```

也可以新建一个终端，但安装依赖时建议先停止 Metro。

### 2. 安装依赖

```powershell
npx.cmd expo install expo-sqlite
```

当前项目已确认安装版本：

```text
expo-sqlite@16.0.10
```

### 3. 检查安装结果

```powershell
npm.cmd list expo-sqlite
git status --short
git diff -- package.json package-lock.json app.json
```

正常修改范围：

- `package.json`；
- `package-lock.json`；
- `app.json`。

`app.json` 中新增以下插件属于正常结果：

```json
"expo-sqlite"
```

如果进入 `git diff` 分页界面，底部显示 `:`，按：

```text
q
```

即可退出并返回 PowerShell。

Windows 显示 `LF will be replaced by CRLF` 只是换行符提示，不是错误。

### 4. 安装后的基线检查

```powershell
npx.cmd tsc --noEmit
npm.cmd run lint
git status --short
```

确认：

- TypeScript 没有报错；
- ESLint 没有 `error`；
- SQLite 安装只产生预期配置和依赖修改；
- 不处理 `npm audit` 提示；
- 不运行 `npm audit fix` 或 `npm audit fix --force`；
- 此时不要单独提交依赖，也不要推送。

---

## 六、正式开发范围

### 1. 允许修改

```text
package.json
package-lock.json
app.json
app/_layout.tsx
app/(tabs)/index.tsx
```

### 2. 允许新增

```text
src/database/migrations.ts
src/database/tasks.ts
```

如果确有必要，可以增加一个数据库类型文件，但必须说明原因并保持 MVP 简单。

### 3. 不得修改

```text
app/(tabs)/plan.tsx
app/(tabs)/review.tsx
app/(tabs)/profile.tsx
../../.obsidian/workspace.json
```

也不得修改与 Day 2 无关的页面和配置。

---

## 七、数据库设计要求

### 1. 基础配置

- 数据库名称：`personal-os.db`；
- 当前数据库版本：`1`；
- 使用 `PRAGMA user_version` 管理版本；
- 启用 `PRAGMA journal_mode = WAL`；
- 启用 `PRAGMA foreign_keys = ON`；
- 初始化失败时抛出错误，不静默忽略；
- SQL 值使用参数绑定，不拼接用户值。

### 2. projects 表

至少包含：

| 字段 | 类型与约束 |
| --- | --- |
| `id` | `TEXT PRIMARY KEY` |
| `name` | `TEXT NOT NULL` |
| `status` | `TEXT NOT NULL` |
| `created_at` | `TEXT NOT NULL` |
| `updated_at` | `TEXT NOT NULL` |

固定项目：

| 字段 | 值 |
| --- | --- |
| `id` | `project-personal-os-mvp` |
| `name` | `Personal OS MVP` |
| `status` | `active` |

使用固定 ID 和 `INSERT OR IGNORE`，防止重复创建。

### 3. tasks 表

至少包含：

| 字段 | 类型与约束 |
| --- | --- |
| `id` | `TEXT PRIMARY KEY` |
| `project_id` | `TEXT`，外键关联 `projects.id`，允许为空 |
| `title` | `TEXT NOT NULL` |
| `priority` | `TEXT NOT NULL` |
| `completed` | `INTEGER NOT NULL DEFAULT 0` |
| `scheduled_date` | `TEXT` |
| `sort_order` | `INTEGER NOT NULL` |
| `created_at` | `TEXT NOT NULL` |
| `updated_at` | `TEXT NOT NULL` |

约束要求：

- `priority` 当前只使用 `P0` 或 `P1`；
- `completed` 只写入 `0` 或 `1`；
- 查询后映射为 TypeScript `boolean`；
- 按 `sort_order` 升序显示；
- `project_id` 外键行为必须明确且适合当前 MVP。

### 4. 固定种子任务

| 顺序 | 任务 | 优先级 |
| --- | --- | --- |
| 1 | 检查 Windows 开发环境 | P0 |
| 2 | 创建 Personal OS Expo 项目 | P0 |
| 3 | 在 iPhone Expo Go 中运行 | P0 |
| 4 | 完成4个底部导航 | P1 |
| 5 | 完成 Day 1验收 | P1 |

要求：

- 全部关联 `project-personal-os-mvp`；
- 每条任务使用固定、唯一的 TEXT ID；
- `scheduled_date` 为 `NULL`；
- `sort_order` 为 1—5；
- 初始 `completed` 为 `0`；
- 使用 `INSERT OR IGNORE`；
- 不能使用随机 ID；
- 后续启动不能覆盖用户已经改变的完成状态；
- UI 文件不再维护另一份最终种子数据源。

---

## 八、数据库初始化与迁移

在 `src/database/migrations.ts` 中完成：

1. 定义数据库名称与 `DATABASE_VERSION = 1`；
2. 读取 `PRAGMA user_version`；
3. 每次数据库连接时启用外键约束；
4. 版本为 0 时创建 `projects` 与 `tasks` 表；
5. 写入固定项目；
6. 写入 5 条固定种子任务；
7. 初始化全部成功后才将 `user_version` 更新为 1；
8. 使用 Expo SDK 54 官方支持的事务 API；
9. 多次启动和 Reload 不得重复插入数据；
10. 不在页面渲染时执行迁移或种子写入。

不得仅使用 `SELECT COUNT(*)` 作为唯一的迁移判断依据。

---

## 九、根布局接入 SQLiteProvider

在 `app/_layout.tsx` 中接入数据库上下文，推荐结构：

```text
RootLayout
└── SQLiteProvider
    └── ThemeProvider
        ├── Stack
        └── StatusBar
```

推荐配置：

```text
databaseName="personal-os.db"
onInit={migrateDbIfNeeded}
```

要求：

- 所有 Router 页面可以使用 `useSQLiteContext()`；
- 数据库迁移在页面查询数据库前完成；
- 页面组件内不得建立独立数据库连接。

---

## 十、数据库任务模块

在 `src/database/tasks.ts` 中实现最小数据访问能力：

1. 查询 5 条开发任务；
2. 按 `sort_order` 升序返回；
3. 将 `completed` 的 `0/1` 映射为 `boolean`；
4. 更新指定任务的完成状态；
5. 同时更新 `updated_at`；
6. 所有动态值使用参数绑定；
7. 导出页面需要的 TypeScript 类型。

不要引入 ORM、通用 Repository 或不必要的抽象。

---

## 十一、改造“今日”页面

修改 `app/(tabs)/index.tsx`：

1. 删除 `INITIAL_TASKS` 作为最终数据源；
2. 任务 ID 改为字符串；
3. 初始任务状态使用空数组；
4. 页面首次加载时从 SQLite 查询任务；
5. 加载中显示：`正在加载任务……`；
6. 读取失败时显示：`任务加载失败，请重新打开 App`；
7. 读取或更新失败时使用 `console.error` 记录实际错误；
8. 点击任务后将完成状态写入 SQLite；
9. 数据库写入成功后同步页面状态或重新查询；
10. 页面显示必须与数据库一致；
11. 同一任务更新期间不可被连续重复触发；
12. 不同任务之间不需要全局锁定；
13. 更新失败后恢复该任务的可操作状态；
14. 防止组件卸载后继续执行无意义的状态更新；
15. 数据库错误不得导致红屏、白屏或页面崩溃；
16. 不使用 AsyncStorage。

必须保留：

- “今天”标题和当前日期；
- 今日重点卡片；
- P0/P1 标签；
- 已完成任务的删除线和透明度效果；
- 快速记录占位按钮；
- ChatGPT 快捷助手占位按钮；
- 今日、计划、复盘、我的四个 Tab；
- 当前页面结构和视觉风格。

两个占位按钮仍提示：

```text
将在后续版本开放
```

---

## 十二、Day 2 禁止实现

- 项目新增、编辑或删除；
- 任务新增、编辑或删除；
- 计划页真实功能；
- 复盘功能；
- “我的”页面新功能；
- 深色模式切换；
- AsyncStorage；
- AI API 或 ChatGPT 真实跳转；
- 服务器、登录、支付或云同步；
- 数据导入、导出或重置；
- 新 UI 框架或状态管理框架；
- ORM 或过度抽象；
- 升级 Expo SDK；
- 重新创建项目；
- `npm audit fix`；
- 与 Day 2 无关的重构；
- 修改或恢复用户已有文件；
- Git 提交或推送。

---

## 十三、向 Codex 发送正式开发 Prompt

将已经确认的《Day 2 V1.1 正式开发 Prompt》完整发送到 VS Code Codex，并在末尾确认包含：

```text
当前 ../../.obsidian/workspace.json 存在用户已有修改。
该文件与 Day 2 无关，不得修改、恢复、删除或加入 Git 提交。

expo-sqlite 已安装成功，当前版本为 16.0.10。
安装后的 TypeScript 和 ESLint 检查均已通过。
请直接开始开发，完成后不要执行 Git 提交或 git push。
```

发送后：

- 等待 Codex 完成开发；
- 不要同时手动修改相同文件；
- 不要启动 Expo；
- 不要提交 Git；
- Codex 若请求读取 Expo SDK 54 官方文档，应允许其读取；
- 如果 Codex 遇到错误，应让其在 Day 2 范围内修复，不要重建项目。

---

## 十四、开发后的代码检查

Codex 完成后执行：

```powershell
Set-Location -LiteralPath 'E:\AI-Master-Roadmap\14_Code代码库\personalOS'

npx.cmd tsc --noEmit
npm.cmd run lint
git status --short
git diff -- app.json package.json package-lock.json app/_layout.tsx "app/(tabs)/index.tsx" src/database
```

判断标准：

- `tsc` 没有报错；
- ESLint 没有 `error`；
- 数据库初始化不会重复插入；
- 查询按 `sort_order` 排序；
- `completed` 正确转换为 `boolean`；
- 种子逻辑不会覆盖已有完成状态；
- 页面状态与数据库一致；
- 修改文件都与 Day 2 有关；
- 计划、复盘和“我的”页面未被修改；
- `.obsidian/workspace.json` 未被 Codex 处理；
- 没有无关配置或超范围功能；
- 没有执行 Git 提交。

如果出现错误，把完整错误原文交给 Codex 修复。不要重建项目、升级 Expo 或运行强制依赖修复。

---

## 十五、启动 Expo

```powershell
npx.cmd expo start --lan --clear
```

说明：

- `--clear` 只清理 Metro 缓存，不会清除 SQLite 数据；
- Expo 启动后，当前终端用于 Metro 日志和快捷键；
- 如需运行普通 PowerShell 命令，请新建或拆分终端；
- 按 `r` 可以 Reload；
- 按 `Ctrl + C` 可以停止 Metro。

---

## 十六、iPhone Expo Go 完整验收

### 1. 首次初始化

- [ ] App 正常进入“今日”；
- [ ] 短暂显示“正在加载任务……”；
- [ ] 最终显示 5 条任务；
- [ ] 任务顺序正确；
- [ ] P0/P1 标签正确；
- [ ] 没有重复任务；
- [ ] 没有红屏、白屏或崩溃。

### 2. 状态切换

将第 1 条和第 4 条设置为完成：

- [ ] 出现删除线；
- [ ] 透明度降低；
- [ ] 再次点击可以恢复未完成；
- [ ] 快速连续点击同一任务不会造成状态混乱。

然后再次将第 1 条和第 4 条设为完成，继续测试。

### 3. Reload 测试

在 Expo 开发菜单中执行 `Reload`，确认：

- [ ] 第 1 条仍为完成；
- [ ] 第 4 条仍为完成；
- [ ] 其他任务状态不变；
- [ ] 任务仍然只有 5 条；
- [ ] 没有重复项目或任务；
- [ ] 任务顺序不变。

### 4. 完全关闭测试

1. 完全关闭 Expo Go；
2. 重新打开 Expo Go；
3. 再次进入 Personal OS。

确认：

- [ ] 第 1 条和第 4 条仍为完成；
- [ ] 任务仍然只有 5 条；
- [ ] 没有恢复为全部未完成；
- [ ] 页面可以正常操作。

不要卸载 Expo Go、清除应用数据或删除本地数据库。这些操作会清除本地数据，不属于本次持久化验收。

### 5. 基础回归

- [ ] 四个 Tab 正常切换；
- [ ] 计划页没有变化；
- [ ] 复盘页没有变化；
- [ ] “我的”页面没有变化；
- [ ] 快速记录仍显示占位提示；
- [ ] ChatGPT 快捷助手仍显示占位提示；
- [ ] App 全程没有红屏、白屏或崩溃。

---

## 十七、验收通过后提交 Git

### 1. 最终检查

先停止 Metro，再执行：

```powershell
git status
git diff
```

确认：

- 修改均属于 Day 2；
- 没有无关页面修改；
- 不包含 `../../.obsidian/workspace.json`；
- TypeScript、ESLint 和 iPhone 验收均已通过。

### 2. 暂存 Day 2 文件

推荐根据实际修改暂存：

```powershell
git add package.json package-lock.json app.json app/_layout.tsx "app/(tabs)/index.tsx" src/database
git status
```

注意：Git 仓库根目录位于 `E:\AI-Master-Roadmap`，`git status` 可能显示带 `14_Code代码库/personalOS/` 前缀的路径。如果上述命令与实际路径不一致，应以 `git status` 显示的路径为准，不要机械复制。

再次确认 `.obsidian/workspace.json` 没有进入暂存区。

### 3. 提交

```powershell
git commit -m "feat: add local project and task persistence"
git status
```

### 4. 推送

如果仓库已经关联 GitHub：

```powershell
git push
git status
```

预期状态：

```text
Your branch is up to date with 'origin/main'.
nothing to commit, working tree clean
```

如果 `.obsidian/workspace.json` 仍有用户本地修改，工作区可能不会显示完全干净；只需确认它未被纳入 Day 2 提交即可。

---

## 十八、Day 2 验收记录

```markdown
# Personal OS MVP｜Day 2执行记录

## 一、本地数据库

- [ ] expo-sqlite安装成功
- [ ] SQLiteProvider接入成功
- [ ] 数据库版本为V1
- [ ] projects表创建成功
- [ ] tasks表创建成功
- [ ] WAL模式启用
- [ ] 外键约束启用

## 二、初始化数据

- [ ] Personal OS MVP项目生成成功
- [ ] 5条种子任务生成成功
- [ ] 任务全部关联项目
- [ ] 固定ID生效
- [ ] 多次启动没有重复数据
- [ ] 已有完成状态没有被覆盖

## 三、任务持久化

- [ ] 点击可以切换完成状态
- [ ] 完成任务显示删除线和透明效果
- [ ] Reload后状态保留
- [ ] 关闭Expo Go后状态保留
- [ ] 快速连续点击不会造成状态混乱

## 四、代码检查

- [ ] npx.cmd tsc --noEmit通过
- [ ] npm.cmd run lint通过
- [ ] 没有无关文件修改
- [ ] 没有超范围功能

## 五、基础回归

- [ ] 四个底部导航正常
- [ ] 快速记录占位功能正常
- [ ] ChatGPT快捷助手占位功能正常
- [ ] 计划、复盘、我的页面正常
- [ ] App没有红屏、白屏或崩溃

## 六、Git

- [ ] 检查git status
- [ ] 检查git diff
- [ ] 完成Git提交
- [ ] 完成git push（如需要）

## 七、遇到的问题

-

## 八、实际用时

-

## 九、Day 2结论

- [ ] 通过，可以进入Day 3
- [ ] 未通过，需要继续修复
```

---

## 十九、常见问题处理

### 1. PowerShell 无法执行 `npx`

如果 `npx.ps1` 被执行策略阻止，使用：

```powershell
npx.cmd tsc --noEmit
npx.cmd expo start --lan --clear
```

无需修改 PowerShell 执行策略。

### 2. 终端无法输入普通命令

说明 Metro 正在运行。可以：

- 新建或拆分终端；或
- 在 Metro 终端按 `Ctrl + C` 停止服务。

### 3. `git diff` 底部显示冒号

当前处于分页浏览界面，按 `q` 退出。

### 4. 安装后显示依赖漏洞

本阶段不处理，不运行：

```text
npm audit fix
npm audit fix --force
```

### 5. Reload 后任务恢复未完成

说明完成状态可能只更新了 React 状态，没有正确写入 SQLite。把完整日志和相关代码交给 Codex 检查，不要重建项目。

### 6. Reload 后任务数量增加

说明种子逻辑不幂等。重点检查固定 ID、`INSERT OR IGNORE`、迁移版本判断和种子执行位置。

---

## 二十、Day 2 完成标准

只有同时满足以下条件，Day 2 才算完成：

- SQLite 初始化成功；
- 项目和 5 条任务不会重复；
- 今日页从数据库读取任务；
- 点击任务会更新数据库；
- Reload 后状态保留；
- 完全关闭 Expo Go 后状态保留；
- 四个底部导航和 Day 1 界面正常；
- TypeScript 与 ESLint 检查通过；
- 无关文件未被修改或提交；
- Git 提交与推送完成。

完成后即可进入 Day 3，不提前开发 Day 3 功能。
