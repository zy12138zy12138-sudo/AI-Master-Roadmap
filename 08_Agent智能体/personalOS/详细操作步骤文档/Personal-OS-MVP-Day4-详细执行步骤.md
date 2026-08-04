# Personal OS MVP｜Day 4 详细执行步骤

> 主题：P0—P3 四级任务优先级与 DeepSeek 入口文案统一
>
> 方案基线：《Personal OS MVP 总体方案 V3.0》
>
> 开发基线：Day 3 已完成数据库 V2、今日任务增删改、日期归属与 iPhone 真机验收
>
> 技术环境：Windows + Expo SDK 54 + React Native + TypeScript + Expo Router + expo-sqlite 16.0.10 + iPhone Expo Go

---

## 一、Day 4 目标

Day 4 只完成两个明确目标：

1. 将任务优先级从 `P0/P1` 扩展为 `P0/P1/P2/P3`；
2. 将今日页的“ChatGPT 快捷助手”占位文案统一改为“DeepSeek 快捷助手”。

完成后应达到：

- 新增、编辑任务时可选择 P0、P1、P2、P3；
- 新建任务默认选择 P2；
- 任务按 `P0 → P1 → P2 → P3` 展示；
- 同一优先级内继续按 `sort_order ASC` 排序；
- 原有 P0/P1 任务、完成状态、日期、排序和项目关系不丢失；
- 四种优先级标签在 iPhone 上清晰可辨；
- 今日页不再显示 ChatGPT，统一显示 DeepSeek；
- Reload 和完全关闭 Expo Go 后，任务数据仍然保留。

Day 4 最关键验收证据：

> 分别新增 P0、P1、P2、P3 任务，确认默认值、编辑能力和排序均正确；Reload 与完全关闭 Expo Go 后数据保持不变，今日页不再出现 ChatGPT 文案。

---

## 二、优先级产品定义

| 级别 | 定义 | 使用建议 | 标签视觉建议 |
|---|---|---|---|
| P0 | 当天必须完成，不完成会产生明确影响 | 每天建议 1—2 项 | 红色系 |
| P1 | 推动核心目标的重要任务 | 每天建议 2—3 项 | 橙色系 |
| P2 | 常规执行任务，可调整日期 | 新任务默认值 | 蓝色系 |
| P3 | 低收益、提醒或有余力再做 | 可延期或删除 | 灰色系 |

规则：

1. 默认优先级必须为 P2；
2. P0 数量只做使用建议，本次不做强制限制；
3. 完成任务后不自动修改其优先级；
4. 编辑优先级不改变任务日期、完成状态和项目归属；
5. 优先级负责展示顺序，`sort_order` 负责同级任务的稳定顺序；
6. 不通过颜色单独传达含义，标签内必须始终显示 P0、P1、P2 或 P3。

---

## 三、本次开发边界

### 3.1 必须实现

1. 建立四级优先级的统一 TypeScript 类型和运行时校验；
2. 新增及编辑弹窗支持四个级别；
3. 新任务默认优先级由 P1 调整为 P2；
4. 数据库查询按优先级和 `sort_order` 稳定排序；
5. 今日页支持四种标签样式；
6. 将 ChatGPT 占位入口文案改为 DeepSeek；
7. 保留 Day 3 全部增删改、完成切换、错误处理和防重复行为；
8. 完成静态检查、iPhone 验收和选择性 Git 提交。

### 3.2 本次不实现

- DeepSeek 外部链接跳转；
- 结构化数据生成或一键复制；
- DeepSeek API、OpenAI API 或任何 API Key；
- P0 数量强制拦截；
- 计划页、复盘页、我的页面真实功能；
- 项目管理、目标管理、日历选择器；
- 拖拽排序、子任务、重复任务、提醒或通知；
- 数据库 V3 或新的数据表、字段、索引；
- 新依赖、UI 框架、ORM 或全局状态框架；
- Expo SDK 升级；
- 与 Day 4 无关的重构和视觉改版。

---

## 四、关键技术方案

### 4.1 数据库保持 V2

`tasks.priority` 已是 `TEXT` 字段，可直接保存 P2、P3，因此 Day 4 不需要数据库迁移：

```text
DATABASE_VERSION = 2
```

不得为了优先级扩展：

- 重建 `tasks` 表；
- 修改 `PRAGMA user_version`；
- 重新插入种子任务；
- 覆盖已有任务数据。

### 4.2 统一优先级定义

优先级类型、合法值、选项顺序和校验逻辑必须有单一来源，避免页面、弹窗和数据库模块分别写一套。

推荐结构由只读检查后结合现有代码确定，例如：

```ts
export const TASK_PRIORITIES = ['P0', 'P1', 'P2', 'P3'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export const DEFAULT_TASK_PRIORITY: TaskPriority = 'P2';
```

如果现有 `tasks.ts` 已适合承载并导出这些定义，可继续复用；否则新增一个职责清晰的小文件。不要同时保留多个 `TaskPriority` 定义。

### 4.3 查询排序

今日任务仍严格按项目和本地当天日期过滤，并在 SQL 层稳定排序：

```sql
WHERE project_id = ?
  AND scheduled_date = ?
ORDER BY CASE priority
  WHEN 'P0' THEN 0
  WHEN 'P1' THEN 1
  WHEN 'P2' THEN 2
  WHEN 'P3' THEN 3
  ELSE 4
END ASC,
sort_order ASC
```

注意：

- 不恢复 `scheduled_date IS NULL` 兼容条件；
- 不把已完成任务强制移到底部；
- 不在页面层再做一套不同的排序；
- 对异常旧值采用稳定兜底排序，但数据库读取校验仍应清楚报告非法数据。

### 4.4 编辑行为

编辑任务优先级时，只更新用户修改的标题和优先级，不应修改：

- `id`；
- `project_id`；
- `scheduled_date`；
- `completed`；
- `sort_order`。

### 4.5 DeepSeek 文案

本次只把今日页占位入口统一为：

```text
DeepSeek 快捷助手
```

点击后仍显示“将在后续版本开放”类中文提示。Day 4 不调用 `Linking.openURL`，也不新增跳转失败逻辑；真实外部跳转留到 Day 9。

---

## 五、预计文件范围

最终以 Codex 只读检查结果为准。预计涉及：

```text
app/(tabs)/index.tsx
components/task-editor-modal.tsx
src/database/tasks.ts
```

如需统一优先级定义，可新增一个小文件，例如：

```text
src/constants/task-priority.ts
```

或使用更符合现有目录结构的等价路径。

原则：

- 只允许一个优先级真源；
- 如果现有文件即可清晰复用，不为拆文件而拆文件；
- 不修改 `src/database/migrations.ts`，除非只读检查发现当前数据库版本常量与 Day 3 最终代码不一致；即便如此也应先停止并说明，不能擅自做新迁移。

禁止修改：

```text
app/_layout.tsx
app/(tabs)/plan.tsx
app/(tabs)/review.tsx
app/(tabs)/profile.tsx
app.json
package.json
package-lock.json
AGENTS.md
../../.obsidian/workspace.json
其他无关文件
```

---

## 六、标准执行顺序

```text
确认 Day 3 提交基线
→ 执行开发前静态检查
→ Codex 只读检查
→ 根据真实代码确认文件范围
→ Codex 正式开发
→ 检查代码差异与数据库版本
→ TypeScript、ESLint、git diff 检查
→ iPhone 功能及持久化验收
→ 选择性 Git 暂存
→ 提交并推送
→ 生成 Day 4 验收文档
```

不要在真机验收前提交或推送。

---

## 七、步骤 1：确认 Day 3 基线

在 PowerShell 中执行：

```powershell
Set-Location -LiteralPath 'E:\AI-Master-Roadmap\14_Code代码库\personalOS'

git status -sb
git log -3 --oneline
git show --stat --oneline HEAD
```

确认：

1. 当前分支为 `main`；
2. Day 3 主提交和“补充 Day 3 今日页任务交互”均已提交并推送；
3. `app/(tabs)/index.tsx` 不再有 Day 3 遗留的未提交改动；
4. 如仍存在 `../../.obsidian/workspace.json` 修改，只记录并保持不动；
5. 没有其他来源不明的代码修改。

如果 `index.tsx` 仍显示未提交修改，先执行：

```powershell
git diff -- "app/(tabs)/index.tsx"
```

不要直接进入 Day 4。必须先确认它是 Day 3 遗留、用户新改动还是格式化产生的变化。

开发前检查：

```powershell
npx.cmd tsc --noEmit
npm.cmd run lint
git diff --check
```

三项通过后再进入只读检查。

---

## 八、步骤 2：让 Codex 执行只读检查

将下面 Prompt 完整复制到 VS Code Codex：

```text
你是 Personal OS MVP 项目的 React Native 开发工程师。

现在只进行 Day 4 只读检查。不要修改、创建或删除任何文件，不要安装依赖，不要执行 Git 暂存、提交或推送。

项目目录：
E:\AI-Master-Roadmap\14_Code代码库\personalOS

Git 仓库根目录：
E:\AI-Master-Roadmap

当前真实基线：
- Expo SDK 54
- React Native + TypeScript + Expo Router
- expo-sqlite 16.0.10
- 数据库版本 2
- Day 3 已完成今日任务新增、编辑、删除、完成切换、当天日期归属与真机持久化验收
- 今日任务查询已严格限定 project_id 和 scheduled_date
- Day 3 已有 task-editor-modal.tsx

Day 4 目标：
1. 将优先级从 P0/P1 扩展为 P0/P1/P2/P3；
2. 新任务默认优先级改为 P2；
3. 今日任务按 P0、P1、P2、P3排序，同级按 sort_order ASC；
4. 将今日页“ChatGPT 快捷助手”占位文案改为“DeepSeek 快捷助手”；
5. 保留 Day 3 全部交互和数据库数据。

请完整读取并遵守项目中的 AGENTS.md，检查真实代码和 Git 状态，重点输出：
1. 当前 Git 分支、同步情况、未提交和未跟踪文件；
2. Day 3 两次提交是否完整包含目标文件；
3. 当前 TaskPriority、任务类型、默认值和运行时校验分别定义在哪里；
4. task-editor-modal.tsx 当前如何展示和返回 P0/P1；
5. index.tsx 如何渲染标签、创建任务和显示快捷助手；
6. tasks.ts 当前查询、插入、更新和校验逻辑；
7. 将优先级定义统一为单一来源的最小方案；
8. 在 SQL 中按 P0→P1→P2→P3、同级 sort_order ASC 排序的方案；
9. 是否确认无需数据库迁移，DATABASE_VERSION 应继续为 2；
10. Day 4 建议修改、新增和禁止修改的准确文件列表；
11. 现有代码中是否还存在其他面向用户的 ChatGPT 文案；
12. 当前 npx.cmd tsc --noEmit、npm.cmd run lint、git diff --check 结果。

约束：
- 不安装新依赖；
- 不修改数据库结构或 user_version；
- 不恢复 scheduled_date IS NULL 查询；
- 不实现 DeepSeek 跳转或 API；
- 不修改计划、复盘、我的页面和 Tab 配置；
- 不修改 AGENTS.md、配置文件、依赖文件；
- ../../.obsidian/workspace.json 是用户已有修改，不得修改、恢复、删除或暂存。

只输出检查结论、风险、建议方案和准确文件范围，不要开始开发。
```

只读检查后重点确认：

- Day 3 是否确实完整提交；
- 数据库是否仍为 V2；
- 当前优先级定义是否重复；
- 是否存在不可预期的旧优先级值；
- DeepSeek 改名是否只需修改今日页；
- 文件范围是否与本文假设一致。

如果结论不一致，先调整正式开发 Prompt，不要让 Codex立即开发。

---

## 九、步骤 3：让 Codex 正式开发

确认只读检查无阻塞问题后，将下面 Prompt 复制给 Codex。若只读检查给出的实际文件名不同，应先据实替换文件范围。

```text
你是 Personal OS MVP 项目的 React Native 开发工程师。现在执行 Day 4 开发。

请先读取并遵守 AGENTS.md，在当前代码基础上做最小修改，不重建项目，不安装依赖，不执行 Git 暂存、提交或推送。

Day 4 目标：
1. 任务优先级支持 P0、P1、P2、P3；
2. 新任务默认优先级为 P2；
3. 今日任务按 P0→P1→P2→P3排序，同一优先级按 sort_order ASC；
4. 今日页快捷助手文案统一改为“DeepSeek 快捷助手”；
5. 保留 Day 3 全部功能、数据和交互。

具体要求：

一、统一优先级模型
- 为 P0/P1/P2/P3 建立唯一的 TypeScript 类型与合法值来源；
- 新增、编辑弹窗、页面展示和数据库校验必须复用同一来源；
- 删除旧的重复类型或校验逻辑，避免不同文件各写一套；
- 默认优先级常量为 P2；
- 不接受类型逃逸，不使用 any 绕过检查。

二、任务编辑弹窗
- 新增和编辑均可选择 P0、P1、P2、P3；
- 四个选项顺序固定为 P0、P1、P2、P3；
- 新建弹窗默认选中 P2；
- 编辑弹窗打开时正确回显原优先级；
- 保留标题 trim、空标题拦截、100 字限制、保存中防重复和原有错误处理；
- P0 只提供“每天建议 1—2 项”的非强制提示，不做数量查询或强制拦截；
- 键盘弹出时仍可正常操作。

三、数据库访问
- DATABASE_VERSION 保持 2；
- 不修改表结构、迁移、种子数据和索引；
- createTask 默认优先级使用 P2；
- updateTask 可安全保存四个合法值；
- 今日查询继续严格使用 project_id = ? AND scheduled_date = ?；
- ORDER BY 使用优先级 CASE：P0、P1、P2、P3，然后 sort_order ASC；
- 不恢复 scheduled_date IS NULL；
- 不修改任务 id、日期、完成状态、项目关系和既有 sort_order；
- 异常优先级值应有清楚的错误处理或稳定兜底，不能导致 SQL 注入或页面静默错乱。

四、今日页展示
- 四级标签文字必须明确显示；
- P0、P1、P2、P3 使用可区分且文字对比度清楚的颜色；
- 不只依赖颜色表达级别；
- 完成状态继续保留删除线和透明度变化；
- 完成状态不改变优先级排序规则；
- 将所有面向用户的“ChatGPT 快捷助手”文案改为“DeepSeek 快捷助手”；
- 点击 DeepSeek 快捷助手仍显示后续开放提示，不实现真实跳转。

五、严格保留
- 保留新增、编辑、删除、删除确认、完成切换、Reload 持久化；
- 保留本地日期工具和数据库 V2迁移结果；
- 不修改计划、复盘、我的页面；
- 不修改 app/_layout.tsx、Tab 配置、app.json、package.json、package-lock.json、AGENTS.md；
- 不修改、恢复、删除或暂存 ../../.obsidian/workspace.json；
- 不做 Day 4 之外的重构。

六、完成后检查
执行：
npx.cmd tsc --noEmit
npm.cmd run lint
git diff --check

完成后清楚输出：
1. 实际修改和新增文件；
2. 优先级唯一来源及默认值；
3. 最终查询和排序条件；
4. 为什么数据库仍为 V2；
5. 原 P0/P1 数据如何保持兼容；
6. DeepSeek 文案改动范围；
7. TypeScript、ESLint、git diff --check 结果；
8. 最终 git status --short；
9. 尚未完成的 iPhone 验收。

不要执行 git add、git commit 或 git push。
```

---

## 十、步骤 4：代码完成后检查

先阅读 Codex 输出，再执行：

```powershell
git status --short
git diff --stat
git diff --check
git diff -- "app/(tabs)/index.tsx"
git diff -- "components/task-editor-modal.tsx"
git diff -- "src/database/tasks.ts"
```

如果新增了优先级定义文件，再单独查看：

```powershell
git diff --no-index -- NUL "src/constants/task-priority.ts"
```

若实际路径不同，替换为真实路径。

重点人工检查：

1. `DATABASE_VERSION` 是否仍为 2；
2. `migrations.ts` 是否没有无理由变化；
3. 四级类型是否只有一个来源；
4. 默认值是否为 P2；
5. SQL 是否同时包含优先级顺序和 `sort_order ASC`；
6. 是否保留 `project_id + scheduled_date` 过滤；
7. 新增与编辑是否都支持四个级别；
8. DeepSeek 只改文案，未提前实现跳转；
9. 禁止修改文件是否保持不变；
10. `.obsidian/workspace.json` 是否仍未暂存且未被处理。

再次执行：

```powershell
npx.cmd tsc --noEmit
npm.cmd run lint
git diff --check
```

三项均通过后再启动 Expo。

---

## 十一、步骤 5：iPhone 真机验收

### 11.1 启动项目

```powershell
npm.cmd start
```

使用 iPhone Expo Go 打开 Personal OS。

### 11.2 回归 Day 3 数据

先确认：

- 原有任务仍存在；
- 原 P0/P1 标签显示正常；
- 已完成状态仍保留；
- 已删除任务没有恢复；
- 页面无红屏或 SQLite 错误；
- 数据库没有重新生成重复任务。

### 11.3 新增优先级验收

1. 点击新增任务；
2. 不手动选择优先级，确认默认选中 P2；
3. 保存一条 P2 任务；
4. 分别新增 P0、P1、P3 任务；
5. 确认四种任务都能成功保存；
6. 确认快速连续点击保存不会生成重复任务；
7. 确认空标题和超过 100 字仍受限制。

### 11.4 排序验收

为了避免原任务干扰，可为四个新任务使用明显标题：

```text
Day4-P0测试
Day4-P1测试
Day4-P2测试
Day4-P3测试
```

确认整体展示顺序：

```text
所有 P0
→ 所有 P1
→ 所有 P2
→ 所有 P3
```

再新增两条相同优先级任务，确认同级内按创建后的 `sort_order` 稳定排列。

### 11.5 编辑验收

1. 将 P3 测试任务编辑为 P0；
2. 确认保存后移动到 P0 分组；
3. 确认标题、完成状态和日期不丢失；
4. 将任务从 P0 改回 P3；
5. 勾选完成后再次编辑优先级；
6. 确认完成状态仍然保持；
7. 删除一条测试任务并确认删除流程仍正常。

### 11.6 标签与文案验收

确认：

- 四种标签均显示明确文字；
- 标签文字与背景对比清楚；
- 完成后的透明度不会让标签完全看不清；
- 今日页不再显示“ChatGPT 快捷助手”；
- 页面显示“DeepSeek 快捷助手”；
- 点击后仍出现后续版本开放提示；
- 计划、复盘、我的页面没有发生变化。

### 11.7 持久化验收

完成上述操作后：

1. 摇动 iPhone 打开 Expo 菜单并点击 Reload，或在 Expo PowerShell 窗口按 `r`；
2. 确认四级优先级、编辑结果、完成状态、删除结果和排序全部保留；
3. 完全关闭 Expo Go；
4. 重新打开 Expo Go 和项目；
5. 再次确认数据与排序保持一致；
6. 确认没有重复任务和已删除任务恢复。

如果出现数据丢失、排序变化、旧任务消失或数据库报错，停止提交并把现象与终端输出交给 Codex 诊断。

---

## 十二、步骤 6：提交前检查

真机验收通过后，按 `Ctrl + C` 停止 Expo，执行：

```powershell
git status --short
git diff --check
git diff --name-only
```

确认变更范围只包含 Day 4 文件，且：

```text
../../.obsidian/workspace.json
```

仍保持未暂存。

如果出现任何未预期文件，不要使用 `git add .`，先检查其差异来源。

---

## 十三、步骤 7：选择性暂存、提交与推送

按实际变更逐个暂存，示例：

```powershell
git add -- "app/(tabs)/index.tsx"
git add -- "components/task-editor-modal.tsx"
git add -- "src/database/tasks.ts"
```

如新增统一优先级文件，再单独加入其真实路径：

```powershell
git add -- "src/constants/task-priority.ts"
```

检查暂存范围：

```powershell
git status --short
git diff --cached --check
git diff --cached --name-only
git diff --cached --stat
```

确认暂存区只包含 Day 4 文件后提交：

```powershell
git commit -m "完成 Day 4 四级任务优先级"
git push origin main
```

最后检查：

```powershell
git status --short
git log -3 --oneline
```

正常情况下，若此前只有 Obsidian 工作区状态未提交，最终应只剩：

```text
 M ../../.obsidian/workspace.json
```

---

## 十四、Day 4 验收清单

| 验收项 | 通过标准 |
|---|---|
| 数据库版本 | 仍为 V2，无新迁移 |
| 优先级类型 | P0/P1/P2/P3 单一来源 |
| 默认优先级 | 新任务默认 P2 |
| 新增 | 四个级别均可保存 |
| 编辑 | 四个级别均可回显和修改 |
| 排序 | P0→P1→P2→P3，同级按 sort_order |
| 旧数据 | 原 P0/P1 及完成状态保持 |
| 日期查询 | 仍严格按项目＋当天日期 |
| 标签视觉 | 四级文字清楚、颜色可区分 |
| DeepSeek 文案 | 今日页不再显示 ChatGPT |
| DeepSeek 行为 | 仍为占位，不提前实现跳转 |
| Day 3 回归 | 增删改、完成切换、防重复正常 |
| 持久化 | Reload 和关闭重开后保持 |
| 静态检查 | TypeScript、ESLint、diff check 全通过 |
| Git 范围 | 只提交 Day 4 文件 |

Day 4 结项标准：

```text
只读检查完成
＋ 四级优先级开发完成
＋ DeepSeek 文案统一
＋ 静态检查通过
＋ iPhone 真机验收通过
＋ 选择性提交并推送
＋ Day 4 验收文档完成
```

---

## 十五、风险与处理原则

### 风险 1：Day 3 的 index.tsx 补充提交未完成

处理：先核对 Git 日志和工作区差异，不能把 Day 3 遗留混入 Day 4 提交。

### 风险 2：类型扩展了，但数据库校验仍只接受 P0/P1

处理：四级合法值必须由新增、编辑、读取和展示共同复用，真机验证 P2/P3 重启后仍能读取。

### 风险 3：只改标签，没有改查询排序

处理：检查最终 SQL，必须明确包含优先级 CASE 和 `sort_order ASC`。

### 风险 4：排序后误改原有 sort_order

处理：本次只改变查询展示顺序，不批量更新已有任务的 `sort_order`。

### 风险 5：为 P2/P3 无意义升级数据库

处理：`priority` 已为 TEXT，本次保持数据库 V2，不修改迁移。

### 风险 6：DeepSeek 改名时提前实现外链

处理：Day 4 只统一用户可见文案，真实跳转留到 Day 9，控制开发范围。

---

## 十六、Day 4 完成后的下一步

Day 4 结束后进入：

```text
Day 5：计划页基础闭环
```

Day 5 开始前先只读检查：

- 未来日期任务能否直接复用 `tasks` 表；
- 是否无需新增独立 `plans` 表；
- 计划页需要的最小日期选择方式；
- 计划任务与今日任务如何基于 `scheduled_date` 自然衔接；
- 哪些结构变化才真正需要数据库 V3。

不要在 Day 4 顺手开发 Day 5。
