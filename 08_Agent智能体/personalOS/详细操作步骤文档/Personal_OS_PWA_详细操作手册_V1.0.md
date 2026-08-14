# Personal OS PWA 详细操作手册 V1.0

> 适用基线：Personal OS Day 7（Expo SDK 54、React Native、TypeScript、Expo Router、原生端 SQLite）  
> 目标：保留现有 iPhone UI 与业务功能，新增可安装、可离线、可本地持久化的 PWA，并通过 GitHub Pages 测试发布。  
> 核心原则：隐私数据永不进入 Git；PWA 使用独立测试数据；Codex 分阶段执行；每阶段验收通过后再提交。

## 一、最终结构

```text
Personal OS
├── UI 与业务层（iOS / Web 共用）
│   ├── 今日
│   ├── 计划
│   ├── 复盘
│   └── 我的
├── Repository 统一数据接口
│   ├── Native：SQLite
│   └── Web/PWA：IndexedDB
├── 数据环境
│   ├── 私人正式数据：只在设备本地，不进入项目目录
│   └── 演示测试数据：单独生成，可安全上传 GitHub
├── PWA
│   ├── Manifest 与图标
│   ├── Service Worker / 离线缓存
│   ├── 数据导出与导入
│   └── 更新提示
└── 发布
    ├── GitHub：仅代码、空数据库结构和虚构演示数据
    └── GitHub Pages：静态 PWA；个人数据保存在 iPhone IndexedDB
```

## 二、执行方式与总顺序

不要一次把整份手册交给 Codex。每次只执行一个阶段，并遵守以下闭环：

1. 让 Codex 先只读检查并给出变更清单。
2. 确认范围后，让 Codex实施该阶段。
3. Codex运行类型检查、Lint、Web 构建及必要测试。
4. 你在 Expo Go、浏览器或 iPhone 上完成对应验收。
5. 查看 `git status` 和 `git diff`，确认没有隐私文件。
6. 单独提交该阶段；不要把多个阶段混在一个提交中。

推荐顺序：

| 阶段 | 目标 | 完成标志 |
|---|---|---|
| 0 | 冻结 Day 7 基线 | 工作区清楚、基线可恢复 |
| 1 | 建立隐私与 Git 护栏 | 真实数据无法被误提交 |
| 2 | Web 兼容性审计 | 当前页面可启动或问题已列清 |
| 3 | Repository + IndexedDB | Web 数据刷新后仍存在 |
| 4 | 独立演示数据机制 | GitHub 只含虚构数据 |
| 5 | 导入导出与数据安全 | 备份可恢复，失败不破坏数据 |
| 6 | PWA 安装与离线 | iPhone 主屏幕可离线打开 |
| 7 | GitHub Pages 发布 | 测试网址可访问且无隐私泄露 |

## 三、阶段 0：冻结 Day 7 基线

### 0.1 人工操作

在 VS Code 打开项目：

```powershell
cd "E:\AI-Master-Roadmap\14_Code代码库\personalOS"
git status
git branch --show-current
git tag --list
```

确认 Day 7 代码、文档和标签已经推送。若工作区存在未提交内容，先判断其归属，不要直接删除或覆盖。

### 0.2 给 Codex 的 Prompt（只读审计）

```text
请只读检查当前 Personal OS 仓库，不修改文件。

目标：确认 Day 7 是否适合作为 PWA 改造基线。
请检查：
1. 当前分支、git status、最近提交和 day7 标签；
2. Expo SDK、Expo Router、TypeScript、expo-sqlite 版本；
3. app/、src/database/、components/ 中与任务、复盘、SQLite 直接调用有关的文件；
4. 当前可用的 typecheck、lint、test、web build 命令；
5. 是否存在未提交文件或用户已有修改。

约束：
- 只读，不安装依赖，不修改文件，不提交、不推送；
- 不读取或输出系统凭据、环境变量值、个人数据内容；
- 若发现真实个人数据，只报告文件路径和风险类型，不展示内容。

输出：当前结构、风险清单、建议修改文件、验证命令。不要开始实现。
```

## 四、阶段 1：隐私保护与 Git 护栏（必须最先实施）

### 1.1 数据分级

| 数据 | 允许上传 GitHub | 保存位置 |
|---|---:|---|
| 源代码、数据库结构、迁移逻辑 | 是 | 仓库 |
| 虚构演示数据 | 是 | `src/fixtures/demo/` 等明确目录 |
| 真实任务、复盘、健康、旅行、项目记录 | 否 | iPhone / Expo Go / PWA 本地存储 |
| 导出的个人备份 JSON | 否 | 仓库外的个人备份目录 |
| `.env`、令牌、密钥、证书 | 否 | 本地安全位置 |
| `dist/` | 原则上不进主分支 | 由部署流程生成 |

### 1.2 推荐目录边界

```text
src/fixtures/demo/           # 只放虚构数据，可提交
local-data/                  # 本地临时数据，整个目录忽略
backups/                     # 本地备份，整个目录忽略
exports/                     # 本地导出，整个目录忽略
.env*                        # 默认忽略，仅允许 .env.example
```

个人备份最好直接保存在仓库之外，例如：

```text
E:\PersonalOS-Private-Backups\
```

不要让 App 在构建时自动读取这个目录，也不要把真实数据写成源码常量。

### 1.3 给 Codex 的 Prompt（实施隐私护栏）

```text
请为当前 Personal OS 仓库实施“隐私数据绝不进入 Git”的第一阶段护栏。

目标：建立演示数据与真实数据的严格边界，为后续 GitHub Pages 发布做准备。

要求：
1. 先检查现有 .gitignore、git tracked files 和项目内疑似数据/备份文件；
2. 完善 .gitignore，至少覆盖 local-data/、backups/、exports/、*.sqlite、*.sqlite3、*.db、*.db-*、个人导出 JSON、.env*、证书和常见密钥文件；
3. 必须保留可提交的 .env.example；不要误忽略正常源码 JSON；
4. 新建独立的虚构演示数据目录及最小样例，内容不得使用我的真实姓名、任务、复盘、健康、旅行或项目数据；
5. 增加隐私说明文档，明确：SQLite/IndexedDB 真实数据只在设备本地，GitHub 只含空结构和虚构演示数据；
6. 增加可在提交前运行的隐私检查脚本，扫描已跟踪文件和待提交 diff 中的数据库、备份、密钥及高风险文件名；发现风险必须失败退出；
7. 如发现已被 Git 跟踪的敏感文件，不删除本地原件，不改写 Git 历史，只列出安全处理建议并停下来等待我确认；
8. 不提交、不推送。

验证：
- 运行隐私检查脚本；
- 运行 git status；
- 列出新增/修改文件；
- 说明哪些真实数据路径被排除；
- 不输出任何疑似隐私数据或密钥的具体内容。

完成条件：演示数据可被应用加载，但真实数据、导出备份和密钥无法通过常规 git add 被加入。
```

### 1.4 人工验收

```powershell
git status --short
git diff -- .gitignore
git ls-files
```

重点确认：

- 没有真实备份、数据库、截图、日志和 `.env` 被跟踪；
- 演示数据全部是虚构内容；
- 隐私检查脚本运行成功；
- 如果敏感文件过去已经提交过，不要仅靠 `.gitignore` 误以为风险已消失。

阶段提交建议：

```powershell
git add .
git diff --cached --name-only
npm.cmd run privacy:check
git commit -m "chore: add privacy safeguards for PWA"
```

## 五、阶段 2：Web 兼容性审计

### 给 Codex 的 Prompt

```text
请执行 Personal OS 的 Expo Web/PWA 兼容性审计，并只修复“让现有 Day 7 页面能在 Web 启动”的最小问题。

要求：
1. 保留根 app/、四个 Tab、现有中文 UI 和原生 SQLite 行为；
2. 检查页面对 expo-sqlite、Alert、日期组件、文件系统、平台 API 和仅原生依赖的直接调用；
3. 优先通过 Platform 或 .web.ts/.native.ts 做最小隔离，不复制整套页面；
4. 本阶段不要实现完整 IndexedDB、Service Worker、GitHub Pages 或 UI 重构；
5. 不加入外部字体、CDN、分析 SDK、API 或任何会向第三方发送数据的功能；
6. 不提交、不推送。

验证命令：
- npx.cmd tsc --noEmit
- npm.cmd run lint
- npx.cmd expo export --platform web

输出：实际修改、仍未解决的问题、Web 启动方法、人工验收步骤。
```

### 人工验收

```powershell
npx.cmd expo start --web
```

检查四个 Tab 能打开、布局没有明显错位、控制台没有持续报错。此阶段数据功能可以暂未完成，但不能白屏或崩溃。

## 六、阶段 3：Repository 统一数据层 + IndexedDB

### 技术原则

业务页面只依赖 Repository，不直接写 SQL 或 IndexedDB：

```text
页面 → Repository 接口
              ├── Native：SQLite
              └── Web：IndexedDB
```

先迁移 Day 7 已存在的数据域，不提前开发 Day 8 功能。

### 给 Codex 的 Prompt

```text
请为 Personal OS 建立跨平台数据访问层，并让 Web 使用 IndexedDB。

目标：现有任务和复盘功能在原生端继续使用 SQLite，在 Web/PWA 使用 IndexedDB；业务页面不再直接依赖数据库实现。

要求：
1. 先列出现有页面直接调用 SQLite 的位置和现有字段/排序/顺延规则；
2. 定义类型明确的 Repository 接口，完整保留 Day 7 行为；
3. Native 实现复用现有 SQLite 与迁移，不删除原代码、不重建数据库；
4. Web 实现使用 IndexedDB；优先选择简单、维护成本低且支持 Safari 的方案；新增依赖前先说明必要性与 Web 兼容性；
5. 使用平台文件选择实现，避免业务页面出现大量 Platform 判断；
6. IndexedDB 必须包含 schemaVersion 和可升级机制，禁止升级时直接清库；
7. 首次启动默认空数据；演示数据只能通过显式“加载演示数据”进入，不得与私人正式数据混合；
8. 不接云端、不上传用户数据、不记录分析日志；
9. 不提交、不推送。

测试与验证：
- 为 Repository 的关键 CRUD、排序、完成切换、日期和迁移逻辑补测试；
- npx.cmd tsc --noEmit
- npm.cmd run lint
- 运行项目现有测试
- npx.cmd expo export --platform web

完成条件：
- Expo Go 原有数据和行为不受破坏；
- Web 新增、编辑、删除、完成任务后刷新仍保留；
-页面代码不直接操作 SQLite 或 IndexedDB。
```

### 人工双端验收

原生端：在 Expo Go 新增、编辑、删除和完成任务，确认原数据仍存在。  
Web 端：新增虚构任务，刷新浏览器、关闭再打开，确认仍存在；清除网站数据后应回到空数据。

## 七、阶段 4：独立演示数据与环境隔离

### 给 Codex 的 Prompt

```text
请完善 Personal OS 的独立演示数据机制。

要求：
1. 演示数据必须位于独立 fixtures/demo 目录，全部为明显虚构内容；
2. 首次启动不得自动写入演示数据；
3. 仅在用户明确点击“加载演示数据”并二次确认后写入当前本地数据库；
4. 提供“清除演示数据”能力，但不得误删用户后来新增的正式数据；请为演示记录增加明确来源标记或安全的批次标识；
5. 生产构建中不得包含真实数据文件、开发日志或本机路径；
6. 为演示数据生成、加载、重复加载和清除补测试；
7. 不提交、不推送。

验证：typecheck、lint、测试、Web export、隐私检查脚本。
输出：数据隔离设计、修改文件和人工验收清单。
```

## 八、阶段 5：JSON 导出、校验与恢复

### 安全规则

- 导出文件默认包含个人数据，文件名应明确带 `PRIVATE`；
- 导出只由用户主动触发，不自动上传 GitHub 或服务器；
- 导入前先解析、校验版本与结构，再写入；
- 导入采用事务或临时区，失败保持现有数据不变；
- 首版建议先支持“替换导入”，合并导入容易产生重复和冲突，可后置；
- 应提供导出摘要：时间、版本、各类记录数量，不在日志中打印正文。

### 给 Codex 的 Prompt

```text
请为 Personal OS 实现本地 JSON 备份与恢复，兼容 Expo Go 和 Web/PWA。

要求：
1. 统一备份格式至少包含 appVersion、schemaVersion、exportedAt、data；
2. 导出文件名包含 PersonalOS_PRIVATE_Backup 和日期时间；
3. 数据仅通过系统下载/分享或用户选择的本地文件流转，不上传网络；
4. 导入前严格校验 JSON、schemaVersion、必要字段、数据类型和记录数量；
5. 首版只实现“验证后替换导入”，导入前二次确认；
6. 写入前生成内存快照或安全回滚点；任何记录失败都必须回滚，不能留下半导入状态；
7. 禁止在控制台和错误日志中打印任务、复盘等正文；
8. Web 使用浏览器文件选择/下载；Native 使用已存在或确认兼容的 Expo 能力；新增依赖前先核对 Expo SDK 54 与 Web 支持；
9. 在“我的”页面显示最近备份时间和隐私提醒；
10. 不提交、不推送。

验证：
- 空数据导出导入；
- 正常数据导出、删除测试数据、重新导入；
- 损坏 JSON、错误版本、缺字段、重复导入；
- typecheck、lint、测试、Web export、隐私检查。

完成后只汇报摘要和记录数量，不展示备份正文。
```

## 九、阶段 6：Manifest、图标、离线缓存与更新

### 给 Codex 的 Prompt

```text
请将 Personal OS 配置为可安装、离线优先的 iPhone PWA。

目标：Safari 添加到主屏幕后，可从桌面独立启动；首次完整加载后，飞行模式仍能打开并使用本地数据。

要求：
1. 配置 Web App Manifest：name、short_name、start_url、scope、display=standalone、theme_color、background_color、图标；
2. 处理 iPhone 安全区、底部 Tab 和动态视口高度，不重构现有 UI；
3. 使用可靠的 Service Worker/Workbox 方案缓存应用外壳和静态资源；
4. IndexedDB 业务数据不得进入 Service Worker Cache；
5. 不缓存用户导出的备份文件，不记录个人数据 URL；
6. 更新采用“发现新版本→用户确认→激活更新”，避免静默切换导致编辑中断；
7. 离线时保留最后可用版本；部署失败不能让旧版本无法启动；
8. 不使用外部 CDN、Google Fonts、分析 SDK 或在线 API；
9. GitHub Pages 子路径通过配置统一处理，不能在源码多处硬编码仓库名；
10. 不提交、不推送。

验证：
- typecheck、lint、测试、Web export、隐私检查；
- 本地用生产构建验证 manifest 和 Service Worker；
- 给出 Safari 安装、飞行模式、关闭重启和更新测试步骤。
```

### iPhone 验收

1. Safari 打开测试地址并完整加载一次。
2. 分享 → 添加到主屏幕 → 打开为 Web App。
3. 新增两条虚构任务，关闭后重新打开，确认仍存在。
4. 开启飞行模式，重新启动 PWA，完成新增/编辑/删除。
5. 恢复网络，确认数据没有丢失。
6. 发布一个仅修改版本文字的测试更新，确认出现更新提示且用户确认后更新。

## 十、阶段 7：GitHub Pages 测试发布

### 发布前人工检查

```powershell
git status --short
git diff --cached --name-only
git ls-files
npm.cmd run privacy:check
npx.cmd tsc --noEmit
npm.cmd run lint
npx.cmd expo export --platform web
```

另外在 GitHub 网页检查仓库公开内容，确保没有：真实姓名、真实任务和复盘、健康数据、旅行预订、邮箱、手机号、本机绝对路径、数据库文件、备份、密钥、令牌、证书。

### 给 Codex 的 Prompt

```text
请为当前 Personal OS 配置 GitHub Pages 自动部署，但不要替我提交或推送。

要求：
1. 使用 GitHub Actions 从源码构建 Expo Web 并部署 dist，主分支不提交手工生成的 dist；
2. Node 和包管理命令以当前 package-lock.json 与项目实际版本为准，使用可复现安装；
3. 正确处理仓库子路径、静态资源、manifest、Service Worker、start_url 和 scope；
4. workflow 使用最小权限，仅授予 Pages 部署所需权限；
5. 构建前依次运行隐私检查、typecheck、lint、测试和 Web export；任何一步失败不得部署；
6. 不在 workflow 中写入密钥、个人数据或真实备份；不需要运行时 secret；
7. 不启用分析、遥测、云同步或第三方数据服务；
8. 检查公开构建产物中是否包含 source map、绝对本机路径、测试备份或真实数据；若存在，先修复；
9. README 只写公开安全的安装与使用说明，演示截图只允许使用虚构数据；
10. 不提交、不推送。

完成后：
- 列出新增/修改文件；
- 给出我需要执行的 git 命令；
- 给出 GitHub Pages 网页端设置步骤；
- 给出发布后 iPhone 验收清单；
- 明确报告隐私扫描结果。
```

### 最终提交与推送

只有所有检查通过后执行：

```powershell
git status
git diff --stat
git add <本阶段确认过的文件>
git diff --cached --name-only
npm.cmd run privacy:check
git commit -m "feat: add offline PWA support"
git push origin main
```

不要直接使用 `git add .` 完成最终发布提交；逐个添加已确认文件更安全。

## 十一、GitHub 发布后的设置

1. 打开 GitHub 仓库的 **Settings → Pages**。
2. Source 选择 **GitHub Actions**。
3. 打开 **Actions**，确认构建与部署全部通过。
4. 打开 Pages 地址，检查首页和静态资源。
5. 在 iPhone Safari 添加到主屏幕并完成阶段 6 的离线验收。
6. GitHub Pages 在中国大陆只作为测试渠道；首次安装和更新受网络访问影响，已正确缓存的版本应可离线使用。

## 十二、每次开发的固定 Codex Prompt 模板

以后 Day 8 及后续功能统一使用：

```text
请在当前 Personal OS 仓库实现【功能名称】。

目标：
【一句话描述用户行为和结果】

上下文：
- Expo SDK 54、React Native、TypeScript、Expo Router；
- Native 使用 SQLite，Web/PWA 使用 IndexedDB；
- 页面只能通过 Repository 访问持久化数据；
- iPhone PWA 离线优先，通过 GitHub Pages 测试发布。

约束：
1. 保持现有中文 UI、四个 Tab 和业务规则；
2. 同时兼容 Expo Go 与 iPhone Safari PWA；
3. 新依赖前先说明必要性并核对 iOS/Web/Safari PWA 兼容性；
4. 不读取、打印、上传或提交真实个人数据；
5. 测试数据只使用 src/fixtures/demo 中的虚构数据；
6. 不接外部 API、分析 SDK、CDN 或在线字体；
7. 不删除数据库重建，必须使用可回滚迁移；
8. 不修改无关文件，不提交、不推送。

完成条件：
- 【列出功能验收点】；
- typecheck、lint、测试、Web export、privacy:check 全部通过；
- Expo Go 原功能无回归；
- Web 刷新、重启及离线后数据仍正确。

请先检查相关文件并给出简短计划，然后直接实施、验证、审查 diff，最后汇报修改文件、验证结果、风险和我的人工验收步骤。
```

## 十三、推荐提交节点

```text
chore: add privacy safeguards for PWA
chore: establish web compatibility baseline
refactor: add cross-platform repositories
feat: add indexeddb persistence for web
feat: add isolated demo data
feat: add private backup and restore
feat: add installable offline PWA
ci: deploy PWA to GitHub Pages
```

每次提交前固定执行隐私检查和 `git diff --cached --name-only`。每完成 2–3 个阶段推送一次；PWA 首次正式验收后创建单独标签，例如 `pwa-v1.0.0`。

## 十四、最终发布验收标准

- [ ] GitHub 仓库和构建产物不含真实个人数据、数据库、备份或密钥。
- [ ] 演示数据独立、虚构、可加载且可安全清除。
- [ ] Expo Go 的 SQLite 数据未被破坏。
- [ ] PWA 的 IndexedDB CRUD、排序、顺延和复盘功能正确。
- [ ] 导出文件可恢复，损坏文件无法破坏现有数据。
- [ ] iPhone 可添加到主屏幕并以 standalone 打开。
- [ ] 飞行模式下可启动、记录并重启。
- [ ] 恢复网络后数据保持不变。
- [ ] 新版本由用户确认后更新，旧版不会因部署失败失效。
- [ ] GitHub Pages 仅承担程序发布，个人数据始终保存在设备本地。

## 十五、当前最优执行决策

现在先停止 Day 8 功能扩展，依次完成阶段 0–7。最重要的前三步是：

1. 隐私护栏与独立演示数据边界；
2. Repository 抽离页面对 SQLite 的直接依赖；
3. IndexedDB 持久化与备份恢复。

这三步完成后，再做 PWA 外壳和 GitHub Pages，能最大程度减少返工和个人数据误上传风险。

