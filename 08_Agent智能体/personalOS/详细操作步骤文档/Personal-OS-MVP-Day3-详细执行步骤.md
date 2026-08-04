# Personal OS MVP｜Day 3 详细执行步骤

> **最终实现说明（2026-08-04）**
> 本文是 Day 3 开发前形成的历史执行方案，原步骤与 Prompt 保留，用于记录当时的决策过程，不追改为事后版本。实际开发在只读检查后补充了数据库 V2 迁移，最终实现以《Personal OS MVP Day 3 验收文档》为准：数据库支持 `0 → 1 → 2` 与 `1 → 2`；仍存在且 `scheduled_date IS NULL` 的固定种子任务通过固定 ID 回填迁移当天的本地日期；已删除种子任务不会重新插入；今日页最终仅查询 `project_id = ? AND scheduled_date = ?`，不再永久兼容 `scheduled_date IS NULL`。Day 3 已完成 iPhone Expo Go 真机验收。后续 P0—P3 与 DeepSeek 快捷助手属于 Day 4 以后范围，不改变 Day 3 验收结论。

> 主题：今日任务管理闭环（新增、编辑、删除与日期归属）
> 适用基线：Day 2 V1.1 已完成并推送，最终提交为 `642c38c（POSday2开发）`
> 技术环境：Windows + Expo SDK 54 + React Native + TypeScript + Expo Router + expo-sqlite 16.0.10 + iPhone Expo Go

---

## 一、版本调整说明

旧版《Personal OS MVP 无 API 方案 V2.0》把 Day 3 定义为“SQLite 本地存储”。但实际开发过程中，SQLite 建库、项目—任务关系、种子任务、完成状态持久化和手机验收已经在 Day 2 V1.1 完成。

因此，Day 3 不再重复接入 SQLite，调整为：

```text
建立今日任务管理闭环
→ 新增任务
→ 编辑任务
→ 删除任务
→ 设置任务日期
→ 今日页只展示当天任务
→ 所有改动写入 SQLite 并持久化
```

本次调整只改变开发日程，不改变 Personal OS MVP 的总体产品方向。

---

## 二、Day 3目标

完成 Day 3 后，用户可以在“今日”页真正管理当天任务：

- 新增一条今日任务；
- 输入任务标题；
- 选择 `P0` 或 `P1`；
- 默认将新任务归入当天；
- 编辑已有任务的标题和优先级；
- 删除任务前进行二次确认；
- 今日页只展示当天任务及未设置日期的历史种子任务；
- 新增、编辑、删除和完成状态均保存至 SQLite；
- Reload 或完全关闭 Expo Go 后，数据仍然保留；
- 保持 Day 2 数据不丢失、不重复、不被重置。

Day 3 最关键的验收证据：

> 新增一条任务并编辑后，Reload 和完全关闭 Expo Go再打开，内容仍然保留；删除该任务后再次 Reload，任务不会重新出现，同时原有任务及完成状态不受影响。

---

## 三、本次开发边界

### 1. 必须实现

1. 今日页新增任务入口；
2. 新增任务表单；
3. 编辑任务入口和表单；
4. 删除任务二次确认；
5. 新任务默认使用当天日期；
6. SQLite 新增、查询、更新和删除函数；
7. 页面操作后的数据刷新；
8. 保存中防重复提交；
9. 清晰的加载、空状态和错误提示；
10. iPhone Expo Go完整验收。

### 2. 本次不实现

- 项目新增、编辑和删除；
- 拖拽排序；
- 子任务；
- 重复任务；
- 提醒和系统通知；
- 日历选择器；
- 计划页真实功能；
- 复盘和评分；
- AI API或ChatGPT真实跳转；
- 云同步、账号、服务器和登录；
- 数据导入、导出或重置；
- 深色模式切换；
- 新的UI框架、状态管理框架或ORM；
- Expo SDK升级；
- 与 Day 3 无关的重构。

---

## 四、当前项目基线

### 1. 项目目录

```text
E:\AI-Master-Roadmap\14_Code代码库\personalOS
```

### 2. Git仓库根目录

```text
E:\AI-Master-Roadmap
```

### 3. Day 2已完成能力

- 数据库：`personal-os.db`；
- 数据库版本：`1`；
- 数据表：`projects`、`tasks`；
- SQLiteProvider 已接入根布局；
- 5条固定种子任务已写入数据库；
- 今日页从 SQLite 读取任务；
- 完成状态可以切换并持久化；
- Reload、关闭重开和防重复验收通过；
- TypeScript、ESLint、`git diff --check` 均通过。

### 4. 已知无关文件

```text
../../.obsidian/workspace.json
```

该文件是用户已有修改，与 Day 3无关。不得修改、恢复、删除、覆盖或加入本次 Git 提交。

---

## 五、Day 3标准执行顺序

```text
确认Day 2基线
→ Codex只读检查
→ 确认Day 3技术方案
→ Codex正式开发
→ TypeScript与ESLint检查
→ 代码差异检查
→ iPhone功能及持久化验收
→ 选择性Git暂存
→ Git提交
→ 推送GitHub
→ 输出Day 3验收文档
```

不要跳过只读检查直接开发，也不要在手机验收前提交 Git。

---

## 六、步骤1：确认Day 2基线

### 1. 打开项目

在 VS Code 中打开：

```text
E:\AI-Master-Roadmap\14_Code代码库\personalOS
```

### 2. 检查Git状态

在 PowerShell 中执行：

```powershell
Set-Location -LiteralPath 'E:\AI-Master-Roadmap\14_Code代码库\personalOS'

git status -sb
git log -3 --oneline
```

确认：

- 当前分支为 `main`；
- 本地与 `origin/main` 同步；
- 能看到 Day 2最终提交 `642c38c POSday2开发`；
- Day 2代码没有未提交改动；
- 记录所有已有的无关修改和未跟踪文件。

### 3. 运行开发前基线检查

```powershell
npx.cmd tsc --noEmit
npm.cmd run lint
git diff --check
```

只有 TypeScript 和 ESLint 均通过，才进入 Day 3开发。

`LF will be replaced by CRLF` 是 Windows 换行符提示，不等于代码错误。

---

## 七、步骤2：让Codex执行只读检查

将下面 Prompt 复制到 VS Code 的 Codex：

```text
你是 Personal OS MVP 项目的 React Native 开发工程师。

现在只进行 Personal OS MVP Day 3 的只读检查，不要修改、创建或删除任何文件，不要安装依赖，不要执行 Git 提交或推送。

项目目录：
E:\AI-Master-Roadmap\14_Code代码库\personalOS

Git仓库根目录：
E:\AI-Master-Roadmap

当前基线：
- Expo SDK 54
- React Native + TypeScript + Expo Router
- expo-sqlite 16.0.10
- Day 2已完成SQLite接入、projects/tasks表、种子任务、任务完成状态持久化
- Day 2最终提交为642c38c（POSday2开发）

Day 3目标：
在今日页实现任务新增、编辑、删除与当天日期归属，所有操作写入SQLite并持久化。

请读取项目中的AGENTS.md、现有代码和Expo SDK 54官方文档，重点检查：
1. 当前Git状态及已有无关修改；
2. app/(tabs)/index.tsx的页面结构和任务交互；
3. src/database/migrations.ts的数据库版本、表结构和迁移逻辑；
4. src/database/tasks.ts已有类型与数据库访问函数；
5. tasks表的scheduled_date是否已满足Day 3要求；
6. 是否需要将数据库版本从1升级到2；
7. 新增、编辑、删除分别适合放在哪些文件；
8. 如何生成稳定且不冲突的本地任务ID；
9. 如何保证删除后的任务不会被种子逻辑重新插入；
10. 如何防止重复保存、重复点击和组件卸载后的状态更新；
11. 如何实现最小表单而不引入新UI依赖；
12. Day 3建议修改、新增和禁止修改的文件；
13. 当前TypeScript和ESLint基线是否通过。

特别说明：
../../.obsidian/workspace.json存在用户已有修改，与Day 3无关，不得修改、恢复、删除或加入Git提交。

只输出检查结论、风险和建议文件范围，不要开始开发。
```

### 只读检查重点判断

检查完成后，重点确认以下问题：

- 如果 `scheduled_date` 已存在且无需变更表结构，优先不升级数据库版本；
- 如果确实需要新增字段、索引或约束，才通过迁移把版本从 `1` 升级到 `2`；
- 不允许为了“看起来完整”而进行无意义迁移；
- 不应再建立第二套任务数据源；
- 不应重新插入或重置 Day 2种子任务；
- 不应安装日期选择器、表单库或状态管理库。

如只读检查发现当前实现与本文假设不一致，应先按实际代码调整正式开发 Prompt，再开始开发。

---

## 八、Day 3产品交互定义

### 1. 今日页任务展示规则

今日页查询：

- `scheduled_date = 今天` 的任务；
- 为兼容 Day 2种子数据，同时展示 `scheduled_date IS NULL` 的既有种子任务；
- 按 `sort_order` 升序显示；
- 不展示已删除任务。

日期必须使用本地日期生成 `YYYY-MM-DD`，不能直接截取 UTC 时间导致日本/中国时区跨日错误。

### 2. 新增任务

点击“新增任务”后显示最小表单：

- 任务标题：必填；
- 优先级：`P0` 或 `P1`，默认 `P1`；
- 日期：默认今天，不在 Day 3开放日期选择；
- 操作：取消、保存。

规则：

- 标题去除首尾空格后不能为空；
- 建议限制为 1—100 个字符；
- 保存中禁用保存按钮；
- 快速连续点击不能重复创建；
- 保存成功后关闭表单并刷新列表；
- 保存失败时保留输入内容并显示提示。

### 3. 编辑任务

通过任务行中的明确操作入口进入编辑，不要让“点击整行编辑”与“点击切换完成”冲突。

允许编辑：

- 标题；
- 优先级。

暂不允许编辑：

- 所属项目；
- 日期；
- 完成时间；
- 排序。

保存成功后更新 `updated_at` 并刷新页面。

### 4. 删除任务

删除前必须二次确认：

```text
确定删除这条任务吗？删除后无法恢复。
```

按钮：

- 取消；
- 删除。

本阶段采用数据库物理删除，不新增软删除字段。删除后刷新列表，任务数量正确减少；Reload 后不得重新出现。

### 5. 空状态

当天没有任务时显示：

```text
今天还没有任务
点击“新增任务”开始安排今天
```

空状态下仍然保留新增任务入口。

---

## 九、Day 3数据库要求

### 1. 复用现有表

优先复用 Day 2的 `tasks` 表：

```text
id
project_id
title
priority
completed
scheduled_date
sort_order
created_at
updated_at
```

### 2. 数据库访问函数

在 `src/database/tasks.ts` 中补充最小函数：

- 查询今日任务；
- 新增任务；
- 编辑任务；
- 删除任务；
- 如有需要，查询下一个 `sort_order`。

要求：

- 所有 SQL 值使用参数绑定；
- `priority` 只接受 `P0` 或 `P1`；
- `completed` 只写入 `0` 或 `1`；
- 日期使用 `YYYY-MM-DD`；
- `created_at`、`updated_at` 使用有效时间字符串；
- 数据库错误向上抛出，由页面捕获；
- 不在页面内直接编写零散 SQL；
- 不引入 ORM、Repository 或通用服务层。

### 3. ID策略

用户新增任务不能使用数组长度、当前排序号或任务标题作为 ID。

优先使用 Expo/React Native 当前环境无需新增依赖即可稳定生成的 ID 方案。若使用时间戳与随机片段组合，必须保证格式固定且冲突概率足够低；不得因此安装大型 UUID 依赖。

### 4. 排序策略

新增任务的 `sort_order` 应排在当前今日任务末尾。

最低要求：

- 查询当前最大 `sort_order`；
- 新任务使用最大值加 1；
- 删除任务后不要求立即重排；
- 多次新增不得出现展示顺序混乱。

### 5. 种子任务保护

不得在 Day 3迁移中更新或重置已有任务的：

- 标题；
- 优先级；
- 完成状态；
- 日期；
- 排序。

注意：Day 2使用固定种子 ID和 `INSERT OR IGNORE`。如果用户删除固定种子任务，下一次启动时是否重新出现，必须依据现有迁移实际执行机制验证。

Day 3的安全要求是：

- 种子插入只能发生在数据库首次初始化或明确迁移阶段；
- 不能在每次启动、页面加载或每次查询时重新执行种子插入；
- 已删除任务不能因为普通 Reload 被重新创建。

---

## 十、建议文件范围

### 1. 优先允许修改

```text
app/(tabs)/index.tsx
src/database/tasks.ts
```

### 2. 仅在确有需要时允许修改

```text
src/database/migrations.ts
```

只有数据库结构发生真实变化时才修改迁移文件并升级版本。

### 3. 可按实际结构新增

如果 `index.tsx` 已明显过长，可以新增一个最小任务表单组件，例如：

```text
src/components/TaskEditor.tsx
```

只有在减少页面复杂度且职责清晰时才新增，不要为了分层而过度拆文件。

### 4. 禁止修改

```text
app/_layout.tsx
app/(tabs)/plan.tsx
app/(tabs)/review.tsx
app/(tabs)/profile.tsx
app.json
package.json
package-lock.json
../../.obsidian/workspace.json
```

如果只读检查证明其中某个项目文件确实必须修改，Codex 必须先说明原因，不能静默扩大范围。

---

## 十一、步骤3：发送Day 3正式开发Prompt

只读检查确认方案后，将下面 Prompt 复制到 VS Code 的 Codex。若只读检查得出的文件范围不同，应先据实修订再发送。

```text
你是 Personal OS MVP 项目的 React Native 开发工程师。

请正式执行 Personal OS MVP Day 3：建立今日任务管理闭环，实现任务新增、编辑、删除和当天日期归属，并将所有操作持久化到现有SQLite数据库。

请先读取现有代码、项目中的AGENTS.md和Expo SDK 54官方文档，简要列出计划修改或新增的文件，然后直接开发，不需要等待我再次确认。

一、项目基线

项目目录：
E:\AI-Master-Roadmap\14_Code代码库\personalOS

Git仓库根目录：
E:\AI-Master-Roadmap

技术栈：
- Expo SDK 54
- React Native
- TypeScript
- Expo Router
- expo-sqlite 16.0.10
- iPhone Expo Go
- 本地存储，无服务器、登录、云同步和AI API

Day 2已经完成：
- personal-os.db
- projects和tasks表
- SQLiteProvider接入
- 5条种子任务
- 今日页读取数据库任务
- 完成状态切换与持久化
- Reload和关闭重开验收

Day 2最终提交：
642c38c POSday2开发

当前../../.obsidian/workspace.json存在用户已有修改。该文件与Day 3无关，不得修改、恢复、删除、覆盖或加入Git提交。

二、Day 3开发目标

1. 今日页增加明确的“新增任务”入口；
2. 新增任务时输入标题并选择P0/P1；
3. 新任务默认scheduled_date为本地当天日期；
4. 支持编辑已有任务的标题和优先级；
5. 支持删除任务，删除前二次确认；
6. 新增、编辑、删除均写入SQLite；
7. 操作成功后页面与数据库保持一致；
8. Reload和完全关闭Expo Go后数据保留；
9. 删除后的任务不会在普通Reload后重新出现；
10. 保留Day 2完成状态切换及现有视觉风格；
11. 保留四个底部Tab和两个占位按钮。

三、查询规则

1. 今日页展示scheduled_date等于本地今天的任务；
2. 为兼容Day 2种子任务，同时展示scheduled_date IS NULL的既有任务；
3. 按sort_order升序显示；
4. 日期必须按本地时区生成YYYY-MM-DD，避免UTC跨日错误；
5. 不建立第二份UI常量任务数据源。

四、新增任务

1. 标题必填，去除首尾空格；
2. 标题建议限制1至100字符；
3. 优先级仅允许P0/P1，默认P1；
4. completed初始为0；
5. scheduled_date为本地今天；
6. project_id当前关联project-personal-os-mvp；
7. ID必须稳定且低冲突，不使用数组长度、标题或sort_order作为ID；
8. 不为ID功能安装新依赖；
9. sort_order排在现有任务末尾；
10. 保存中禁用重复提交；
11. 保存成功后关闭表单并刷新列表；
12. 保存失败时保留输入并显示友好提示，同时console.error记录实际错误。

五、编辑任务

1. 提供与完成状态切换不冲突的编辑入口；
2. 允许编辑标题和优先级；
3. 不编辑项目、日期和排序；
4. 标题校验规则与新增一致；
5. 更新时同步更新updated_at；
6. 保存中防止重复提交；
7. 成功后刷新页面；
8. 失败时不丢失原数据，并记录实际错误。

六、删除任务

1. 提供明确删除入口；
2. 删除前使用Alert二次确认；
3. 提示：确定删除这条任务吗？删除后无法恢复。
4. 取消不产生数据库变化；
5. 确认后执行数据库删除；
6. 删除成功后刷新列表；
7. 删除失败时恢复可操作状态并记录错误；
8. 防止同一任务连续重复删除；
9. 普通Reload后已删除任务不得重新出现。

七、数据库要求

1. 优先复用现有tasks表和scheduled_date字段；
2. 如果无需改变表结构，不要为了Day 3机械升级数据库版本；
3. 只有确需新增字段、索引或约束时，才将数据库版本从1迁移到2；
4. 不得删除或重建现有表；
5. 不得重置现有任务及completed状态；
6. 所有SQL值使用参数绑定；
7. 在src/database/tasks.ts中实现清晰、最小的增删改查函数；
8. 不在页面中直接散布SQL；
9. 不引入ORM、Repository或过度抽象；
10. 数据库错误向上抛出供页面处理；
11. 种子插入不能在每次启动、Reload或页面查询时执行。

八、页面状态和错误处理

1. 保留明确加载状态；
2. 无任务时显示“今天还没有任务”和“点击新增任务开始安排今天”；
3. 任务列表操作期间只锁定相关任务或表单，不全局锁死页面；
4. 防止组件卸载后继续执行不必要的状态更新；
5. 数据库错误不能导致红屏、白屏或App崩溃；
6. 用户提示使用中文；
7. console.error记录开发所需的真实错误；
8. 不做与Day 3无关的视觉改版。

九、文件范围

优先允许修改：
- app/(tabs)/index.tsx
- src/database/tasks.ts

仅在确有数据库迁移需要时允许修改：
- src/database/migrations.ts

如果index.tsx过长，可新增一个最小任务编辑组件，但需说明原因。

原则上不得修改：
- app/_layout.tsx
- app/(tabs)/plan.tsx
- app/(tabs)/review.tsx
- app/(tabs)/profile.tsx
- app.json
- package.json
- package-lock.json
- ../../.obsidian/workspace.json

如确实必须扩大范围，先在结果中明确说明原因，且不得加入新依赖。

十、必须保留

1. 今天标题和当前日期；
2. 今日重点卡片；
3. P0/P1标签；
4. 完成状态切换；
5. 删除线和透明度效果；
6. 快速记录占位按钮；
7. ChatGPT快捷助手占位按钮；
8. 今日、计划、复盘、我的四个Tab；
9. 当前整体视觉风格；
10. 两个占位按钮继续提示“将在后续版本开放”。

十一、本次禁止

1. 项目管理；
2. 拖拽排序、子任务、重复任务和提醒；
3. 日期选择器；
4. 计划页、复盘页和我的页面新功能；
5. AI API和ChatGPT真实跳转；
6. 服务器、账号、登录、支付或云同步；
7. 数据导入导出或重置；
8. AsyncStorage；
9. 新UI框架、状态管理框架或ORM；
10. 升级Expo SDK；
11. 安装新依赖；
12. npm audit fix；
13. 重新创建项目；
14. 与Day 3无关的重构；
15. 修改用户已有无关文件；
16. git add .；
17. git commit；
18. git push。

十二、开发完成后的检查

执行：
npx.cmd tsc --noEmit
npm.cmd run lint
git diff --check
git status --short
git diff -- "app/(tabs)/index.tsx" src/database

检查发现错误时，在Day 3范围内修复并重新运行。

十三、完成后输出

请清楚输出：
1. 实际修改和新增的文件；
2. 是否读取并遵守AGENTS.md；
3. 核对了哪些Expo SDK 54官方API；
4. 是否修改数据库结构和版本，为什么；
5. 今日日期如何按本地时区生成；
6. 今日任务查询规则；
7. 新任务ID生成策略；
8. 新增任务的数据流程；
9. 编辑任务的数据流程；
10. 删除及二次确认流程；
11. 如何防重复保存和重复点击；
12. 如何保护Day 2既有数据；
13. 如何确保已删除任务不被种子逻辑恢复；
14. 加载、空状态和错误处理；
15. TypeScript、ESLint和git diff --check结果；
16. git status中的已有修改和本次修改；
17. 尚未完成的手机端验证；
18. PowerShell启动命令；
19. iPhone Expo Go完整验收步骤。

现在开始开发。完成后不要执行Git提交或git push。
```

---

## 十二、步骤4：审查Codex开发结果

Codex 完成后，先不要启动 Expo，也不要提交 Git。核对其结果是否包含：

- 实际修改文件；
- 数据库是否升级及理由；
- 新增、编辑、删除函数；
- 今日日期生成方式；
- ID和排序策略；
- 防重复提交机制；
- TypeScript、ESLint和差异检查结果；
- 未完成的iPhone验证。

重点检查：

1. 没有安装新依赖；
2. 没有修改计划、复盘和我的页面；
3. 没有修改 `.obsidian/workspace.json`；
4. 没有重置 Day 2完成状态；
5. 没有在页面中建立第二份固定任务数据；
6. 没有在每次加载时重新插入种子任务；
7. 没有执行 Git 提交或推送。

如范围异常或检查失败，先让 Codex 在 Day 3范围内修复。

---

## 十三、步骤5：本地代码检查

在 PowerShell 执行：

```powershell
Set-Location -LiteralPath 'E:\AI-Master-Roadmap\14_Code代码库\personalOS'

npx.cmd tsc --noEmit
npm.cmd run lint
git diff --check
git status --short
git diff -- "app/(tabs)/index.tsx" src/database
```

通过标准：

- TypeScript 退出码为 `0`；
- ESLint 没有 `error`；
- `git diff --check` 没有 whitespace error；
- 文件范围符合 Day 3；
- 无关文件保持未暂存；
- 没有 Git 提交。

如果 `git diff` 进入分页，按 `q` 退出。

---

## 十四、步骤6：启动Expo

### 1. 正常启动

```powershell
npx.cmd expo start
```

Windows 和 iPhone 连接同一个 Wi-Fi，使用 iPhone 相机或 Expo Go扫描二维码。

### 2. 局域网连接失败

先按：

```text
Ctrl + C
```

然后执行：

```powershell
npx.cmd expo start --tunnel
```

不要卸载 Expo Go、清除应用数据或删除 SQLite 数据库，否则无法验证对 Day 2数据的兼容性。

---

## 十五、步骤7：iPhone Expo Go验收

### A. 回归检查

- [ ] App正常打开，无红屏、白屏或崩溃；
- [ ] 原有5条任务正常显示；
- [ ] 原有P0/P1标签正确；
- [ ] Day 2保留的完成状态没有丢失；
- [ ] 四个底部Tab正常切换；
- [ ] 计划、复盘和我的页面没有变化；
- [ ] 两个占位按钮提示正常。

### B. 新增任务

1. 点击“新增任务”；
2. 不输入标题直接保存；
3. 确认无法保存，并出现中文校验提示；
4. 输入：

```text
完成Day 3手机验收
```

5. 选择 `P0`；
6. 快速连续点击保存按钮；
7. 确认只新增1条任务；
8. 确认新任务显示在列表末尾；
9. 确认标题和P0标签正确。

### C. 编辑任务

1. 打开“完成Day 3手机验收”的编辑入口；
2. 将标题改为：

```text
完成Day 3 iPhone验收
```

3. 将优先级改为 `P1`；
4. 保存；
5. 确认页面立即显示新标题和P1；
6. 确认编辑操作不会误切换完成状态。

### D. 完成状态兼容

1. 点击新任务切换为完成；
2. 确认出现删除线和透明度效果；
3. 再次点击，确认恢复未完成；
4. 确认编辑与删除入口仍可正常使用。

### E. Reload持久化

1. 将新任务设为完成；
2. 在 Expo Go执行 Reload；
3. 确认编辑后的标题仍然存在；
4. 确认优先级仍为P1；
5. 确认完成状态仍然保留；
6. 确认任务没有重复；
7. 确认原有任务和状态没有变化。

### F. 完全关闭重开

1. 完全关闭 Expo Go；
2. 重新打开同一项目；
3. 确认新任务仍存在；
4. 确认标题、优先级和完成状态均正确；
5. 确认总任务数与预期一致。

### G. 删除任务

1. 点击新任务的删除入口；
2. 在确认框先点击“取消”；
3. 确认任务仍然存在；
4. 再次点击删除；
5. 点击“删除”确认；
6. 确认任务从列表消失；
7. 执行 Reload；
8. 确认被删除任务没有重新出现；
9. 完全关闭并重开 Expo Go；
10. 再次确认被删除任务没有出现；
11. 确认原有5条任务仍在且没有重复。

### H. 稳定性

- [ ] 快速连续点击保存不会创建重复任务；
- [ ] 快速连续点击编辑或删除不会造成状态错乱；
- [ ] 正常切换Tab不会黑闪；
- [ ] Reload初始化期间如出现短暂黑闪，1—2秒内恢复且不影响数据，可记录为既有非阻塞观察项；
- [ ] 全程没有红屏、白屏、闪退或数据库错误。

---

## 十六、Day 3验收判定

### 通过

同时满足：

- 新增、编辑、删除均可正常执行；
- 所有操作均正确写入 SQLite；
- Reload 和完全关闭重开后数据一致；
- 删除任务不会重新出现；
- Day 2既有任务和完成状态没有丢失或重复；
- TypeScript、ESLint、差异检查通过；
- 无关页面和文件未被修改；
- App无阻塞性错误。

### 不通过

出现任一情况：

- 新增任务重复；
- 标题、优先级或完成状态在 Reload 后丢失；
- 删除任务在 Reload 后重新出现；
- Day 2任务丢失、重复或完成状态被重置；
- 日期因时区错误归入前一天或后一天；
- 正常使用时频繁黑屏；
- 红屏、白屏、闪退或数据库报错；
- TypeScript或ESLint未通过；
- 修改了 Day 3范围外文件。

出现问题时，先保留现场，不卸载 Expo Go、不清理数据库、不提交 Git，将截图、终端日志和复现步骤交给 Codex修复。

---

## 十七、步骤8：停止Expo并复查Git

验收结束后，在运行 Expo 的终端按：

```text
Ctrl + C
```

然后执行：

```powershell
git status --short
git diff --check
git diff --stat
```

确认只有 Day 3文件变更。不要执行：

```powershell
git add .
```

因为仓库中仍可能存在 `.obsidian/workspace.json` 和其他无关未跟踪目录。

---

## 十八、步骤9：选择性暂存与Git提交

以下命令以“仅修改今日页和任务数据库模块”为例。实际执行时必须以最终开发文件为准。

```powershell
git add -- "app/(tabs)/index.tsx" src/database/tasks.ts
```

如果本次确实修改了迁移文件或新增组件，再明确追加对应路径，例如：

```powershell
git add -- src/database/migrations.ts src/components/TaskEditor.tsx
```

检查暂存区：

```powershell
git status --short
git diff --cached --check
git diff --cached --stat
git diff --cached
```

确认：

- 只有 Day 3文件进入暂存区；
- `.obsidian/workspace.json` 未暂存；
- 无关的 `??` 文件或目录未暂存；
- 暂存内容不包含 Day 3以外改动。

提交：

```powershell
git commit -m "feat: manage daily tasks"
```

检查：

```powershell
git status --short
git log -1 --oneline
```

---

## 十九、步骤10：推送GitHub

本地提交确认正确后执行：

```powershell
git push origin main
```

然后检查：

```powershell
git status -sb
git log -1 --oneline
```

成功时应显示：

```text
## main...origin/main
```

不应再出现 `[ahead 1]`。

---

## 二十、Day 3验收记录模板

```markdown
# Personal OS MVP｜Day 3验收记录

## 一、基础信息

- 验收日期：
- 验收设备：iPhone
- 运行环境：Expo Go
- Expo SDK：54
- 数据库：personal-os.db
- Day 2基线提交：642c38c
- Day 3提交：

## 二、代码检查

- [ ] TypeScript通过
- [ ] ESLint通过
- [ ] git diff --check通过
- [ ] 未安装新依赖
- [ ] 未修改无关页面
- [ ] 未修改.obsidian/workspace.json

## 三、功能验收

- [ ] 新增任务成功
- [ ] 空标题校验正常
- [ ] 快速连续保存不会重复新增
- [ ] 编辑标题成功
- [ ] 编辑优先级成功
- [ ] 编辑不会误切换完成状态
- [ ] 删除取消正常
- [ ] 删除确认正常
- [ ] 完成状态切换正常
- [ ] 空状态正常

## 四、持久化验收

- [ ] Reload后新增任务保留
- [ ] Reload后编辑内容保留
- [ ] Reload后完成状态保留
- [ ] 关闭Expo Go重开后数据保留
- [ ] 删除后Reload不再出现
- [ ] 删除后关闭重开不再出现
- [ ] 原有任务没有丢失或重复
- [ ] Day 2完成状态没有被重置

## 五、稳定性

- [ ] 无红屏
- [ ] 无白屏
- [ ] 无闪退
- [ ] 无数据库错误
- [ ] 正常切换Tab无黑闪

## 六、Git闭环

- [ ] 仅暂存Day 3文件
- [ ] Git提交成功
- [ ] GitHub推送成功
- [ ] main与origin/main同步

## 七、发现的问题

-

## 八、非阻塞观察项

-

## 九、最终结论

- [ ] 通过，可以进入Day 4
- [ ] 有条件通过，需记录观察项
- [ ] 未通过，需要修复
```

---

## 二十一、常见问题

### 1. 新增任务出现两条

通常是保存按钮未锁定或保存函数被重复触发。不要手动删库，应修复提交锁和数据库调用逻辑后重新验收。

### 2. Reload后删除任务重新出现

重点检查种子逻辑是否在每次启动时执行。种子数据只能在首次初始化或明确迁移中插入，不能在普通页面加载时补回。

### 3. 今日任务日期不正确

检查是否使用 `toISOString().slice(0, 10)` 直接生成日期。该写法基于 UTC，在亚洲时区临近午夜时可能跨日。应使用本地年月日生成 `YYYY-MM-DD`。

### 4. 点击编辑时同时切换完成状态

说明任务行的点击区域发生事件冲突。编辑和删除必须有独立按钮，并避免事件继续传递到任务完成切换区域。

### 5. 删除后sort_order不连续

Day 3不要求删除后重排。只要显示顺序稳定、新增任务能排在末尾即可。

### 6. Expo Reload期间短暂黑闪

如果只在开发模式 Reload初始化期间出现、1—2秒自行恢复、正常使用不出现且数据无异常，可沿用 Day 2结论记录为非阻塞观察项。

### 7. Git状态中仍有无关文件

这是允许的，只要不进入 Day 3暂存区和提交。始终使用明确路径进行 `git add -- ...`，不要使用 `git add .`。

---

## 二十二、完成定义

Day 3只有在以下事项全部闭环后才算完成：

- 今日任务可新增、编辑和删除；
- 新任务正确归入本地当天；
- 所有变化通过 SQLite 持久化；
- Reload 与完全关闭重开验收通过；
- 删除任务不会被重新创建；
- Day 2既有数据完整；
- 代码检查通过；
- iPhone验收通过；
- Git选择性提交完成；
- GitHub推送完成；
- Day 3验收文档已输出。

完成后再进入 Day 4“状态记录与每日复盘”，不要提前开发精力、情绪、专注度或每日评分功能。
