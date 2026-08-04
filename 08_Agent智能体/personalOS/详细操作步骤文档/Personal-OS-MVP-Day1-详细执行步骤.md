# Personal OS MVP｜Day 1 详细执行步骤

> 目标：在现有 Expo Router 项目中完成可运行的 Personal OS MVP 首页框架，并在 iPhone 的 Expo Go 中完成验收。

## 一、Day 1 交付目标

完成以下内容：

- 底部导航包含“今日、计划、复盘、我的”4个 Tab；
- App 默认进入“今日”页；
- 今日页显示5条固定任务及 P0/P1 优先级；
- 点击任务可在“未完成/已完成”之间切换；
- 已完成任务显示删除线和透明度效果；
- 保留“快速记录”和“ChatGPT 快捷助手”两个占位入口；
- 计划、复盘、我的页面可正常打开；
- 在 iPhone Expo Go 中正常运行；
- 通过 TypeScript、ESLint 和基础 Git 检查。

Day 1 不实现：数据持久化、SQLite、任务增删改、AI API、登录、云同步、深色模式切换。

## 二、开始前确认

### 1. 项目目录

```text
E:\AI-Master-Roadmap\14_Code代码库\personalOS
```

### 2. 打开项目

在 VS Code 中选择：

```text
文件 → 打开文件夹 → personalOS
```

### 3. 打开 PowerShell 终端

```powershell
Set-Location -LiteralPath 'E:\AI-Master-Roadmap\14_Code代码库\personalOS'
```

### 4. 检查当前状态

```powershell
git status
npm.cmd install
npx.cmd expo --version
```

确认：

- [ ] 当前目录是 `personalOS`；
- [ ] 项目依赖安装完成；
- [ ] Git 没有不明修改；
- [ ] 不升级 Expo SDK；
- [ ] 不重新创建项目。

## 三、确认 Day 1 文件结构

目标结构：

```text
personalOS/
├─ app/
│  ├─ _layout.tsx
│  └─ (tabs)/
│     ├─ _layout.tsx
│     ├─ index.tsx
│     ├─ plan.tsx
│     ├─ review.tsx
│     └─ profile.tsx
├─ app.json
├─ package.json
└─ tsconfig.json
```

处理规则：

- 删除模板自带的 `app/(tabs)/explore.tsx`；
- 不建立根级 `app/review.tsx`；
- 不安装新依赖；
- 不引入数据库或 AI 模块；
- 保留 Expo Router 的现有项目结构。

## 四、配置底部导航

修改：

```text
app/(tabs)/_layout.tsx
```

要求：

1. `Tabs` 的 `initialRouteName` 设置为 `index`；
2. 配置4个页面：

| 路由文件 | 页面标题 | 作用 |
| --- | --- | --- |
| `index.tsx` | 今日 | 默认首页与今日任务 |
| `plan.tsx` | 计划 | Day 1 占位页 |
| `review.tsx` | 复盘 | Day 1 占位页 |
| `profile.tsx` | 我的 | Day 1 占位页 |

3. 底部只显示这4个 Tab；
4. 不再显示 Explore；
5. 图标可继续使用项目已有图标方案，不安装新图标库。

验收：

- [ ] 默认打开“今日”；
- [ ] 底部导航名称为中文；
- [ ] 4个 Tab 均可点击切换；
- [ ] 没有多余的 Explore 页面入口。

## 五、创建三个占位页面

分别创建或修改：

```text
app/(tabs)/plan.tsx
app/(tabs)/review.tsx
app/(tabs)/profile.tsx
```

Day 1 只需显示对应页面标题及简单说明，例如：

- 计划：后续用于周计划与项目计划；
- 复盘：后续用于每日和每周复盘；
- 我的：后续用于个人资料与系统设置。

要求：

- 页面能够正常渲染；
- 风格与今日页保持一致；
- 不提前实现表单、数据库或复杂交互。

## 六、开发“今日”页面

修改：

```text
app/(tabs)/index.tsx
```

### 1. 页面结构

今日页从上到下包含：

1. “今天”标题；
2. 当前日期；
3. 今日重点卡片；
4. 5条任务；
5. “快速记录”按钮；
6. “ChatGPT 快捷助手”按钮。

### 2. Day 1 任务数据

页面内定义5条固定任务：

| 顺序 | 任务 | 优先级 | 初始状态 |
| --- | --- | --- | --- |
| 1 | 检查 Windows 开发环境 | P0 | 未完成 |
| 2 | 创建 Personal OS Expo 项目 | P0 | 未完成 |
| 3 | 在 iPhone Expo Go 中运行 | P0 | 未完成 |
| 4 | 完成4个底部导航 | P1 | 未完成 |
| 5 | 完成 Day 1验收 | P1 | 未完成 |

建议类型：

```ts
type Priority = 'P0' | 'P1';

type TodayTask = {
  id: number;
  title: string;
  priority: Priority;
  completed: boolean;
};
```

Day 1 使用页面内的 `useState` 管理任务状态。Reload 后恢复默认未完成属于正常结果，持久化安排在 Day 2。

### 3. 任务交互

点击任意任务时：

- `completed: false` 切换为 `true`；
- 再次点击恢复为 `false`；
- 已完成任务标题增加删除线；
- 已完成任务整体透明度降低；
- 其他任务状态不受影响。

### 4. 优先级标签

- P0：用于最重要任务，视觉上更突出；
- P1：用于次重要任务；
- 标签必须清晰可读；
- 不增加 P2 或其他等级。

### 5. 两个占位按钮

点击“快速记录”或“ChatGPT 快捷助手”时，使用 `Alert` 显示：

```text
将在后续版本开放
```

Day 1 不实现真实记录、ChatGPT 跳转或 API 调用。

## 七、让 Codex 执行开发

向 VS Code Codex 提交开发要求时，应明确：

```text
请只完成 Personal OS MVP Day 1：

1. 保留现有 Expo SDK 和 Expo Router 项目；
2. 底部建立今日、计划、复盘、我的4个Tab；
3. initialRouteName 设置为 index；
4. 删除 explore.tsx，不创建根级 review.tsx；
5. 今日页显示指定的5条任务和P0/P1标签；
6. 使用useState实现完成状态切换；
7. 完成状态显示删除线和透明度效果；
8. 两个占位按钮使用Alert提示“将在后续版本开放”；
9. 不安装新依赖；
10. 不实现SQLite、AsyncStorage、AI API、登录或云同步；
11. 完成后运行TypeScript和ESLint检查；
12. 不执行Git提交或git push。
```

Codex 完成后先审查结果，不立即提交 Git。

## 八、运行代码检查

在 PowerShell 中执行：

```powershell
Set-Location -LiteralPath 'E:\AI-Master-Roadmap\14_Code代码库\personalOS'

npx.cmd tsc --noEmit
npm.cmd run lint
git status --short
git diff
```

判断标准：

- [ ] TypeScript 没有报错；
- [ ] ESLint 没有 `error`；
- [ ] 修改文件都与 Day 1 有关；
- [ ] 没有安装无关依赖；
- [ ] 没有加入数据库、AI 或其他超范围功能；
- [ ] 没有执行 Git 提交。

如果 `git diff` 进入分页界面，按：

```text
q
```

退出后再输入下一条命令。

## 九、启动 Expo

执行：

```powershell
npx.cmd expo start --lan --clear
```

说明：

- 终端显示二维码后保持运行；
- 该终端运行 Metro 时不能输入普通 PowerShell 命令；
- 需要运行其他命令时，新建或拆分一个终端；
- 停止 Expo 时按 `Ctrl + C`；
- `--clear` 用于清理 Metro 缓存。

## 十、iPhone Expo Go 验收

### 1. 连接

1. Windows 电脑与 iPhone 连接同一个 Wi-Fi；
2. 在 iPhone 打开 Expo Go；
3. 扫描终端或浏览器中的二维码；
4. 等待 Personal OS 加载完成。

### 2. 首页验收

- [ ] App 默认进入“今日”；
- [ ] 页面显示“今天”和当前日期；
- [ ] 显示今日重点卡片；
- [ ] 显示5条任务；
- [ ] 任务顺序正确；
- [ ] 前3条为 P0，后2条为 P1；
- [ ] 没有红屏、白屏或崩溃。

### 3. 完成状态验收

1. 点击第1条任务；
2. 确认标题出现删除线且透明度降低；
3. 再次点击第1条任务；
4. 确认恢复为未完成；
5. 分别点击其他任务，确认互不影响。

### 4. 占位按钮验收

- [ ] 点击“快速记录”，显示“将在后续版本开放”；
- [ ] 点击“ChatGPT 快捷助手”，显示“将在后续版本开放”。

### 5. 导航验收

- [ ] 今日页正常；
- [ ] 计划页正常；
- [ ] 复盘页正常；
- [ ] 我的页面正常；
- [ ] Tab 切换时没有报错；
- [ ] 底部没有 Explore。

### 6. Reload 验收

在 Expo 开发菜单中选择 Reload：

- [ ] App 可以重新加载；
- [ ] 重新进入今日页；
- [ ] 5条任务仍正常显示；
- [ ] 任务恢复为默认未完成。

注意：Day 1 的状态仅保存在内存中，Reload 后恢复默认状态不是错误。

## 十一、Day 1 完整验收清单

```markdown
# Personal OS MVP｜Day 1 验收记录

## 一、项目运行

- [ ] Expo项目正常启动
- [ ] iPhone Expo Go连接成功
- [ ] 没有红屏、白屏或崩溃

## 二、底部导航

- [ ] 今日Tab正常
- [ ] 计划Tab正常
- [ ] 复盘Tab正常
- [ ] 我的Tab正常
- [ ] 默认进入今日页
- [ ] Explore已删除

## 三、今日页面

- [ ] 显示今天标题和日期
- [ ] 显示今日重点卡片
- [ ] 显示5条固定任务
- [ ] P0/P1标签正确
- [ ] 任务顺序正确

## 四、任务交互

- [ ] 点击可切换完成状态
- [ ] 完成任务显示删除线
- [ ] 完成任务透明度降低
- [ ] 再次点击可恢复未完成
- [ ] 各任务状态互不影响

## 五、占位功能

- [ ] 快速记录提示正常
- [ ] ChatGPT快捷助手提示正常

## 六、代码检查

- [ ] npx.cmd tsc --noEmit通过
- [ ] npm.cmd run lint通过
- [ ] 没有无关文件修改
- [ ] 没有安装新依赖
- [ ] 没有超范围功能

## 七、Git

- [ ] 已检查git status
- [ ] 已检查git diff
- [ ] 验收后完成Git提交
- [ ] 按需完成git push

## 八、遇到的问题

-

## 九、实际用时

-

## 十、Day 1结论

- [ ] 通过，可以进入Day 2
- [ ] 未通过，需要继续修复
```

## 十二、验收通过后提交 Git

先再次检查：

```powershell
git status
git diff
```

确认无误后，根据 `git status` 中的实际 Day 1 文件执行：

```powershell
git add app
git status
git commit -m "feat: complete personal os day 1 interface"
git status
```

如果已经关联 GitHub，并且确定需要同步：

```powershell
git push
```

不要把 `.obsidian/workspace.json` 等无关文件加入本次提交。

## 十三、Day 1 完成标准

只有同时满足以下条件，才能进入 Day 2：

1. iPhone Expo Go 可正常打开 App；
2. 默认进入“今日”页；
3. 4个底部导航全部正常；
4. 5条任务和优先级显示正确；
5. 任务完成状态可切换；
6. 两个占位按钮提示正常；
7. TypeScript 和 ESLint 检查通过；
8. Git 中没有混入无关修改。

固定执行顺序：

> 环境与工作区检查 → Codex开发 → 代码检查 → 启动Expo → iPhone验收 → Git提交与推送。

