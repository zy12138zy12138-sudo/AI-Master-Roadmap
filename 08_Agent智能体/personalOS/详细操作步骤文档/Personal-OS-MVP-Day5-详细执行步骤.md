# Personal OS MVP Day 5 详细执行步骤

> 基线日期：2026-08-05
> 上位文档：《Personal OS MVP 总体方案 V3.2》
> 当前开发起点：Day 1—Day 4 已完成，数据库版本 V3
> Day 5 主题：计划页基础闭环

## 一、Day 5 最终目标

Day 5 只完成一件事：让“计划”页可以按日期管理任务。

```text
选择日期
→ 查看该日期任务
→ 新增、编辑、完成或删除任务
→ Reload / 重启后数据保持
```

完成后，用户可以提前安排未来日期的任务。Day 5 不复制任务，不创建 `plans` 表，也不接入 DeepSeek API。

## 二、功能范围

### 2.1 必须完成

1. 计划页默认选中今天；
2. 支持切换日期，至少可以查看今天和未来日期；
3. 页面明确显示当前选中日期；
4. 只展示 `scheduled_date` 等于选中日期的任务；
5. 支持为选中日期新增任务；
6. 新增任务支持标题与 P0—P3，默认 P2；
7. 支持编辑任务标题和优先级；
8. 支持切换完成状态；
9. 支持二次确认后删除任务；
10. 排序保持 P0→P1→P2→P3，同级按 `sort_order ASC`；
11. 切换日期、Reload、关闭 Expo Go 后重新打开，数据仍正确；
12. 继续复用 `tasks` 表的 `scheduled_date`，数据库保持 V3。

### 2.2 明确不做

- 不创建 `plans` 表；
- 不升级数据库版本；
- 不复制或迁移任务；
- 不开发周历、月历或第三方日历组件；
- 不安装新的日期选择依赖；
- 不开发拖拽排序、重复任务、提醒通知和子任务；
- 不实现 Day 6 专项跨页面衔接验收；
- 不修改复盘页和我的页；
- 不调用 DeepSeek API，不开发 AI 决策页；
- 不增加主题模式切换；
- 不重建项目，不进行无关重构。

## 三、产品与数据规则

### 3.1 日期规则

- 日期统一使用本地时区 `YYYY-MM-DD`；
- 禁止用 `toISOString()` 直接生成业务日期，避免日本/中国时区跨日偏差；
- 优先复用今日页现有本地日期工具；
- 计划页默认日期每次进入页面时应能正确反映本地今天；
- Day 5 最小范围不要求查看历史日期；若现有实现自然支持历史日期，可以保留，但不能扩大开发范围。

### 3.2 任务规则

- 计划任务与今日任务都是 `tasks` 表中的普通任务；
- `scheduled_date` 是任务归属日期的唯一依据；
- 新增任务保存到当前选中日期，而不是固定保存到今天；
- 编辑标题或优先级时不得改变日期、完成状态、项目、ID、创建时间和既有排序；
- 完成切换只更新完成状态与必要的更新时间；
- 删除后任务不得因 Reload 或重启恢复。

### 3.3 查询规则

计划页查询必须限定项目和选中日期：

```sql
WHERE project_id = ?
  AND scheduled_date = ?
ORDER BY CASE priority
  WHEN 'P0' THEN 0
  WHEN 'P1' THEN 1
  WHEN 'P2' THEN 2
  WHEN 'P3' THEN 3
  ELSE 4
END,
sort_order ASC
```

不允许恢复 `scheduled_date IS NULL`，也不能一次加载全部日期后只在页面内临时筛选。

## 四、预计文件范围

最终以 Codex 只读检查为准，预计涉及：

| 类型 | 预计文件 | 处理方式 |
|---|---|---|
| 计划页 | `app/(tabs)/plan.tsx` | 必须修改 |
| 任务数据访问 | `src/database/tasks.ts` | 优先复用；仅在缺少通用按日期接口时最小修改 |
| 任务编辑弹窗 | `components/task-editor-modal.tsx` | 优先直接复用；只有日期参数或文案确有需要时才修改 |
| 日期工具 | 真实代码中的现有日期工具 | 只复用；确需通用化时最小修改 |

禁止预先假定新建文件。若现有接口已经满足 Day 5，减少修改范围。

## 五、标准执行顺序

```text
确认 Day 4 Git 基线
→ 开发前静态检查
→ Codex 只读检查
→ 确认真实文件和接口
→ Codex 正式开发
→ 人工检查差异
→ TypeScript / ESLint / diff check
→ iPhone 真机验收
→ 选择性暂存、提交和推送
→ 生成 Day 5 验收报告
```

不要在真机验收前提交或推送。

## 六、步骤 1：确认 Day 4 基线

在 PowerShell 中逐条执行：

```powershell
Set-Location -LiteralPath 'E:\AI-Master-Roadmap\14_Code代码库\personalOS'
git status --short --branch
git log -3 --oneline
git show --stat --oneline HEAD
```

确认：

1. 当前分支为 `main`；
2. Day 4 提交已经存在并已推送；
3. 仓库没有来源不明的未提交代码；
4. 异常文件 `tatus --short --branch` 已经清理；
5. 若仓库外层仍有用户自己的 Obsidian 工作区修改，只记录，不修改、不暂存；
6. 不执行 `git add .` 或 `git add -A`。

执行静态检查：

```powershell
npx.cmd tsc --noEmit
npm.cmd run lint
git diff --check
```

三项通过后再进入只读检查。若失败，先记录原始错误，不要让 Codex 把历史错误混入 Day 5。

## 七、步骤 2：让 Codex 执行只读检查

将下面 Prompt 完整复制到 VS Code Codex：

```text
你是 Personal OS MVP 项目的 React Native 开发工程师。

现在只进行 Day 5 开发前检查。不要修改、创建或删除任何文件，不要安装依赖，不要执行 git add、git commit 或 git push。

项目目录：
E:\AI-Master-Roadmap\14_Code代码库\personalOS

Git 仓库根目录：
E:\AI-Master-Roadmap

当前真实基线：
- Expo SDK 54
- React Native + TypeScript + Expo Router
- expo-sqlite 16.0.10
- 数据库版本 V3
- tasks 表已有 scheduled_date、priority、completed、sort_order、project_id 等字段
- 优先级为 P0/P1/P2/P3，新任务默认 P2
- 排序规则为 P0→P1→P2→P3，同级 sort_order ASC
- Day 4 已完成并通过 iPhone 真机验收

Day 5 目标：
1. 计划页默认选中本地今天；
2. 支持选择日期并查看该日期任务；
3. 支持为选中日期新增任务；
4. 支持编辑标题和优先级、完成切换、删除；
5. Reload 和重启后数据保持；
6. 复用 tasks.scheduled_date，不创建 plans 表，数据库保持 V3。

请完整读取并遵守项目中的 AGENTS.md，检查真实代码和 Git 状态，重点输出：
1. 当前分支、同步情况、未提交及未跟踪文件；
2. Day 4 提交是否完整，工作区是否适合作为 Day 5 起点；
3. app/(tabs)/plan.tsx 当前完整结构和占位内容；
4. 今日页如何加载、刷新、新增、编辑、完成和删除任务；
5. 页面在 Tab 切换或重新获得焦点时如何刷新数据；
6. task-editor-modal.tsx 可否不修改直接复用；
7. tasks.ts 现有查询、新增、更新、完成和删除接口是否可按任意日期复用；
8. 本地 YYYY-MM-DD 日期工具位于哪里，是否避免 toISOString 跨日问题；
9. 当前固定项目 ID 如何获得，计划页应如何复用；
10. 不安装依赖时，最小日期选择交互应该如何实现；
11. Day 5 是否确实不需要数据库迁移；
12. 建议修改、新增和禁止修改的准确文件列表；
13. npx.cmd tsc --noEmit、npm.cmd run lint、git diff --check 的结果；
14. 现有代码对空状态、加载、错误、防重复保存和小屏键盘交互的处理情况。

必须遵守：
- 只读，不修改任何文件；
- 不安装日期组件或其他依赖；
- 不创建 plans 表，不修改 DATABASE_VERSION；
- 不复制任务，不一次读取全部任务后仅在前端筛选；
- 不恢复 scheduled_date IS NULL；
- 不修改今日、复盘、我的页面，除非只读检查证明共享逻辑无法复用，并先说明原因；
- 不实现 Day 6、Day 7 或 DeepSeek API；
- 不增加主题切换；
- 不修改 AGENTS.md、app.json、package.json、package-lock.json；
- 不修改、恢复、删除或暂存用户已有的仓库外文件。

只输出检查结论、风险、最小实现方案和准确文件范围，不要开始开发。
```

### 只读检查后的判断

只有同时满足以下条件才进入正式开发：

- Day 4 基线干净或仅有明确的用户自有改动；
- 已定位计划页、日期工具和数据库接口；
- 已确认数据库无需升级；
- 已确认日期选择的最小实现方式；
- 已确认不会覆盖用户已有修改；
- TypeScript、ESLint 和 diff check 无阻塞错误。

若实际文件名或函数名不同，应以检查结果修改下一段 Prompt 中的文件范围，不能让 Codex 猜测。

## 八、步骤 3：让 Codex 正式开发

确认只读检查无阻塞问题后，将下面 Prompt 复制给 Codex。将其中“允许修改文件”替换为只读检查确认的真实文件。

```text
你是 Personal OS MVP 项目的 React Native 开发工程师。现在执行 Day 5 开发。

请先读取并遵守 AGENTS.md，在当前代码基础上做最小修改。不重建项目，不安装依赖，不执行 git add、git commit 或 git push。

当前基线：
- Expo SDK 54 + React Native + TypeScript + Expo Router
- expo-sqlite 16.0.10
- 数据库 V3
- tasks.scheduled_date 已存在
- 任务优先级 P0/P1/P2/P3，新任务默认 P2
- 排序 P0→P1→P2→P3，同级 sort_order ASC

Day 5 目标：完成计划页按日期管理任务的基础闭环。

一、日期选择与页面状态
- 计划页默认选中本地今天；
- 页面清楚显示当前选中日期；
- 提供不依赖新组件的轻量日期切换方式，至少支持向前一天、回到今天、向后一天；
- 日期切换必须使用本地 YYYY-MM-DD 工具，禁止直接使用 toISOString 作为业务日期；
- 切换日期后立即查询该日期任务；
- 快速连续切换日期时，旧请求结果不得覆盖最新日期结果；
- 从其他 Tab 返回计划页时重新读取当前选中日期任务，保证数据新鲜。

二、任务列表
- 只查询当前项目且 scheduled_date 等于选中日期的任务；
- 不加载全部日期后只在前端筛选；
- 排序保持 P0→P1→P2→P3，同级 sort_order ASC；
- 显示 P0—P3 标签、标题和完成状态；
- 已完成任务保留删除线和透明度变化；
- 无任务时显示清楚的空状态，并引导新增任务；
- 加载和数据库错误应有稳定状态，不得造成红屏或静默失败。

三、新增任务
- 新任务必须写入当前选中日期；
- 支持标题与 P0/P1/P2/P3；
- 默认 P2；
- 复用现有任务编辑弹窗、标题 trim、空标题拦截、100 字限制和防重复保存；
- 新增成功后关闭弹窗并重新读取当前日期任务；
- 不重复插入任务，不插入 scheduled_date 为空的任务。

四、编辑、完成与删除
- 支持编辑标题和优先级并正确回显；
- 编辑不得改变 scheduled_date、completed、sort_order、project_id、created_at 或任务 ID；
- 支持完成/未完成切换，操作后刷新当前日期列表；
- 删除必须二次确认；
- 删除或更新失败时保持界面和数据库状态一致；
- 操作一条任务不得影响其他日期任务。

五、数据库与架构边界
- 复用 tasks 表和 scheduled_date；
- 数据库保持 V3，不创建迁移，不修改 DATABASE_VERSION；
- 不创建 plans 表，不复制或移动任务；
- 优先复用 tasks.ts 现有按日期查询和 CRUD；只有接口确实不能表达任意日期时才做最小通用化；
- SQL 继续使用参数绑定；
- 不新增第二份静态任务数据源。

六、视觉与可用性
- 延续今日页现有固定主题、卡片、标签和按钮风格；
- 不开发深色/浅色模式；
- 日期切换、任务点击和新增按钮在 iPhone 上有足够点击区域；
- 小尺寸 iPhone 上日期文本、按钮和任务标题不重叠；
- 键盘打开时仍能编辑并保存任务。

七、严格范围
- 允许修改文件：以刚才只读检查确认的最小文件列表为准；
- 原则上只修改 app/(tabs)/plan.tsx；仅在真实接口不足时最小修改 src/database/tasks.ts、现有日期工具或 task-editor-modal.tsx；
- 不修改 migrations.ts；
- 不修改今日、复盘、我的页面和 Tab 配置；
- 不修改 app.json、package.json、package-lock.json、AGENTS.md；
- 不实现 Day 6 的专项跨页面验收、Day 7 复盘或 Day 8—10 AI；
- 不修改、恢复、删除或暂存用户已有的无关文件；
- 不做 Day 5 之外的重构。

八、完成后检查
执行：
npx.cmd tsc --noEmit
npm.cmd run lint
git diff --check

完成后清楚输出：
1. 实际修改和新增文件；
2. 日期选择及本地日期处理方式；
3. 最终查询条件与排序；
4. 新任务如何绑定选中日期；
5. 新增、编辑、完成和删除如何复用现有逻辑；
6. 为什么数据库仍为 V3；
7. 如何处理页面聚焦刷新和快速切换日期竞态；
8. TypeScript、ESLint、git diff --check 结果；
9. 最终 git status --short；
10. 尚待人工完成的 iPhone 验收项。

不要执行 git add、git commit 或 git push。
```

## 九、步骤 4：代码完成后人工检查

先阅读 Codex 的开发总结，再执行：

```powershell
git status --short
git diff --stat
git diff --check
git diff --name-only
```

对实际修改文件逐个检查，例如：

```powershell
git diff -- "app/(tabs)/plan.tsx"
git diff -- "src/database/tasks.ts"
git diff -- "components/task-editor-modal.tsx"
```

重点检查：

1. 是否只修改了允许范围；
2. 是否误改 `migrations.ts` 或数据库版本；
3. 是否创建了 `plans` 表或其他无关表；
4. 日期是否使用本地工具，而非直接 `toISOString()`；
5. 查询是否同时限定 `project_id` 和 `scheduled_date`；
6. 新任务是否使用选中日期；
7. 是否保留 P0—P3、默认 P2 和正确排序；
8. 编辑是否意外改动任务日期或完成状态；
9. 删除是否有二次确认；
10. 是否处理页面重新聚焦后的数据刷新；
11. 是否存在全部数据前端筛选、重复请求覆盖、重复提交等问题；
12. 是否碰触用户已有无关文件。

再次执行：

```powershell
npx.cmd tsc --noEmit
npm.cmd run lint
git diff --check
```

三项均通过后再启动 Expo。

## 十、步骤 5：iPhone 真机验收

### 10.1 启动

```powershell
npm.cmd start
```

用 iPhone Expo Go 打开 Personal OS，进入“计划”页。

### 10.2 初始状态与日期

确认：

- 默认选中的是手机本地今天；
- 日期文字清楚，无 UTC 跨日；
- 可以切换前一天、今天和后一天；
- 连续快速切换日期不会显示错误日期的任务；
- 日期按钮在 iPhone 上容易点击且没有重叠。

### 10.3 新增任务

选择明天，依次新增：

```text
Day5-明日-P0测试
Day5-明日-P1测试
Day5-明日-P2测试
Day5-明日-P3测试
```

确认：

- 未选择优先级时默认 P2；
- 四级优先级均可保存；
- 标题空白和超过 100 字仍会被拦截；
- 连续点击保存不会重复新增；
- 新任务只出现在明天，不会出现在今天或后天。

### 10.4 列表与排序

在明天的任务列表确认：

```text
P0 → P1 → P2 → P3
```

再新增两条同优先级任务，确认同级顺序稳定。切换今天、明天、后天多次，确认各日期任务互不混淆。

### 10.5 编辑

1. 把 P3 测试任务改为 P0；
2. 确认它移动到 P0 区域；
3. 确认任务仍属于明天；
4. 修改标题后再次保存；
5. 确认 ID、完成状态和其他任务不受影响。

### 10.6 完成与删除

1. 勾选一条明日任务完成；
2. 确认删除线和透明度正常；
3. 切换日期再返回，确认完成状态保留；
4. 取消完成，确认状态恢复；
5. 删除一条任务，确认出现二次确认；
6. 取消一次删除，任务应保留；
7. 再确认删除，任务应消失且不能恢复。

### 10.7 Tab 切换回归

1. 在计划页查看今天；
2. 切换到今日页完成或编辑一条今天的任务；
3. 返回计划页；
4. 确认计划页重新读取数据并展示最新状态。

这里只验证数据新鲜度，不把 Day 6 的完整“计划进入今日”专项验收提前并入 Day 5。

### 10.8 持久化

1. Reload 项目；
2. 确认明日任务、优先级、编辑结果、完成状态和删除结果保持；
3. 完全关闭 Expo Go；
4. 重新打开项目；
5. 再次检查今天、明天和后天；
6. 确认无重复任务、串日期或已删除任务恢复。

### 10.9 Day 1—Day 4 回归

确认：

- 今日页仍能新增、编辑、删除和完成任务；
- 今日页四级优先级、排序和 DeepSeek 占位入口正常；
- 复盘页和我的页没有意外变化；
- 数据库无迁移、CHECK constraint 或红屏错误。

任何一项失败，都先停止提交，记录页面现象与终端完整错误并交给 Codex 诊断。

## 十一、步骤 6：提交前检查

真机验收全部通过后，按 `Ctrl + C` 停止 Expo，执行：

```powershell
git status --short
git diff --check
git diff --name-only
git diff --stat
```

确认：

- 只有 Day 5 的预期代码文件；
- 没有异常未跟踪文件；
- 没有 `migrations.ts`、依赖文件或用户无关文件；
- 不使用 `git add .` 或 `git add -A`。

## 十二、步骤 7：选择性暂存、提交与推送

按实际修改文件逐个暂存。示例：

```powershell
git add -- "app/(tabs)/plan.tsx"
```

只有实际修改了其他允许文件时才逐个添加，例如：

```powershell
git add -- "src/database/tasks.ts"
git add -- "components/task-editor-modal.tsx"
```

检查暂存区：

```powershell
git status --short
git diff --cached --check
git diff --cached --name-only
git diff --cached --stat
```

确认暂存区只包含 Day 5 后提交：

```powershell
git commit -m "完成 Day 5 计划页基础闭环"
git push origin main
```

最后检查：

```powershell
git status --short --branch
git log -3 --oneline
```

理想状态为分支与远端同步，且没有来源不明的未提交文件。

## 十三、Day 5 验收清单

| 验收项 | 通过标准 |
|---|---|
| 默认日期 | 计划页默认选中本地今天 |
| 日期切换 | 可稳定查看至少前一天、今天和后一天 |
| 日期显示 | 无 UTC 跨日问题 |
| 查询范围 | 严格按项目＋选中日期查询 |
| 新增 | 任务写入当前选中日期 |
| 优先级 | P0—P3 均可用，默认 P2 |
| 排序 | P0→P1→P2→P3，同级 sort_order ASC |
| 编辑 | 标题和优先级可修改，日期等其他字段不变 |
| 完成切换 | 可完成和取消完成，状态正确保存 |
| 删除 | 二次确认有效，删除后不恢复 |
| 空状态 | 无任务日期有明确提示和新增入口 |
| 页面刷新 | 切回计划页能读取最新数据 |
| 日期隔离 | 今天、明天和后天任务不串数据 |
| 持久化 | Reload 和关闭重开后数据保持 |
| 数据库 | 保持 V3，无新迁移、无 plans 表 |
| 回归 | Day 1—Day 4 功能正常 |
| 静态检查 | TypeScript、ESLint、diff check 全通过 |
| Git 范围 | 只提交 Day 5 文件 |

Day 5 结项标准：

```text
只读检查完成
+ 计划页按日期管理任务完成
+ 数据库保持 V3
+ iPhone 真机与持久化验收通过
+ Day 1—Day 4 回归通过
+ 选择性提交并推送
+ Day 5 验收报告完成
```

## 十四、主要风险与处理原则

### 风险 1：日期出现前后一天偏差

处理：统一复用本地日期工具，不直接用 UTC `toISOString()` 生成业务日期，并在接近午夜时特别复测。

### 风险 2：新增任务仍固定保存到今天

处理：保存函数必须显式传入当前选中日期，真机使用明日测试任务验证日期隔离。

### 风险 3：页面切换后数据不更新

处理：计划页获得焦点时重新查询当前日期，不能只在首次挂载时加载一次。

### 风险 4：快速切换日期出现旧结果覆盖

处理：确保查询结果只应用到发起请求时仍然有效的选中日期，或采用等价的竞态保护。

### 风险 5：为了计划功能新建 plans 表

处理：Day 5 已有 `tasks.scheduled_date` 足够表达计划，数据库必须保持 V3。

### 风险 6：复制造成今日与计划状态不一致

处理：两个页面读取同一条 `tasks` 记录，不复制、不迁移、不建立第二份数据源。

### 风险 7：误提交用户文件或异常文件

处理：只使用逐文件 `git add -- <path>`，提交前检查 cached 文件列表，禁止 `git add .` 和 `git add -A`。

## 十五、Day 5 完成后的下一步

Day 5 验收并推送后，生成《Personal OS MVP Day 5 功能验收报告》，然后进入：

```text
Day 6：计划任务进入今日与跨页面一致性验收
```

Day 6 重点确认：

- `scheduled_date` 等于今天时，任务自然出现在今日页；
- 计划页与今日页读取同一条数据库记录；
- 任一页面编辑或完成后，另一页面显示一致；
- 不复制、不重新创建、不迁移任务；
- 跨日期任务不会错误进入今日。

不要在 Day 5 顺手实现 Day 7 复盘或 Day 8 DeepSeek API。

## 十六、最终实施与验收结果

Day 5 已于 2026-08-05 完成开发、静态检查、iPhone 真机验收、提交和推送。最终代码提交为：

```text
e3ad222 POSday5 开发
```

最终实现相较初始执行方案补充并完成了以下真机优化：

- 计划页提供前一天、今天、后一天和紧凑日历选择，日期按本地 `YYYY-MM-DD` 处理；
- 今日页与计划页的新增、编辑弹窗均支持选择今天及未来计划日期；
- 编辑任务可主动改期，更新原记录并保持完成状态，不复制任务；
- 弹窗修改计划日期时保留已输入标题；
- 快速切换日期采用请求竞态保护和静默刷新，任务统计及空状态不再抖动；
- 今日页与计划页重新聚焦时读取最新 SQLite 数据；
- 四个 Tab 预加载并保留场景，Reload 后首次切换不再黑闪；
- App 固定为浅色 UI，不提供日间/夜间模式切换；
- 数据库保持 V3，未创建 `plans` 表，未新增迁移或依赖；
- P0—P3、默认 P2、优先级排序及删除二次确认保持不变。

最终检查与验收：

```text
npx.cmd tsc --noEmit：通过
npm.cmd run lint：通过
git diff --check：通过
iPhone Expo Go 真机验收：通过
Day 5：已结项，可进入 Day 6
```
