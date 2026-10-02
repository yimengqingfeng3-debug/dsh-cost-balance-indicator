# Changelog

版本号遵循语义化版本；每个条目都是一次可复现的改动，配套 `npm test` 与 `verify/self-check.ps1`。

## 0.8.0

- **取色器**：色号右侧新增屏幕取色按钮（Chromium 原生 `EyeDropper`），点一下吸屏幕上任意像素写入当前这一项；环境不支持时按钮自动隐藏。
- **充值链接跟随 API endpoint**：主机半部按 `config.baseUrl` 推导 `topUpUrl` / `loginUrl` 并放进**每一个**余额响应（成功、无 key、HTTP 错误、缓存命中都带），因此未登录时点「充值」会去登录页，自建网关则去自己的根地址。
- **预设改用桌面端自身主题色**（实测自应用伺服的主题样式表）：浅白 = 文字 `#0F1115` / 背景 `#F5F6F7` / 边框 `#E1E5EE`；深色 = 文字 `#F9FAFB` / 背景 `#2C2C2E` / 边框 `#353638`（`--dsw-alias-*` 与 `--dsw-static-*` 同源）。
- **时段规则与官网同步（含节假日）**：高峰 = 周一至周五 09:00–12:00 / 14:00–18:00（北京时间）；**周末与法定节假日全天闲时**；内置 2026 官方节假日表（国办发明电〔2025〕7号，33 天），主机与浏览器两半一致。
- **官方模型名与价格**：补齐 `deepseek-flash`（及 `-v4-flash`、`-vision-exp`）与 `deepseek-v4-pro(-0813)`，价格用官网人民币牌价（flash 峰 2/0.04/8 元、闲 1/0.02/4；v4-pro 峰 9/0.3/27、闲 4.5/0.15/13.5，每百万 token）。时段胶囊的覆盖栏会显示当前时段每百万 token 花费。
- 修掉一个真问题：原先只认 `deepseek-v4-flash`，而官方现行模型名是 `deepseek-flash`，名字对不上就读不出价格。
- 测试 59 项（含节假日规则两半一致性、余额失败路径也携带充值/登录地址）。新增 `verify/diag.mjs`：读浏览器半部的自诊断报告（此前定位 `remote.settings` 未注入崩溃靠的就是它）。
## 0.7.3

**修复桌面端"启用后界面没反应"：客户端模块依赖指向了一个不存在的模块**

- **根因**：`package.json` 的 `dsh.client.inject` / `dshClient.inject`（继承自上游）声明了四个**客户端模块**依赖，
  其中 `@deepseek-ai/dsh-client-ui-slots` **在任何核心里都不存在**。CLI 的加载器忽略悬空依赖，
  桌面端的加载器则**一直等它** → 浏览器半部**永不激活** → 一枚胶囊都不出现，而且**没有任何报错弹窗**。
  证据来自应用自己的启动图（新增工具 `verify/boot-entry.mjs`）：

  ```
  inject @deepseek-ai/dsh-client-locale             PRESENT
  inject @deepseek-ai/dsh-client-ui-conversation    PRESENT
  inject @deepseek-ai/dsh-client-ui-model-selection PRESENT
  inject @deepseek-ai/dsh-client-ui-slots           *** MISSING from graph ***
  ```

- **修复**：两个 inject 列表置为 `[]`。浏览器半部本来就在包内用 `ctx.inject(["slots"], …)` 等待**服务**，
  不需要任何**模块级**依赖——服务等待跨内核可移植，模块 id 不是。
- **护栏**：`npm test` 增加「包不得声明客户端模块依赖」；`verify/self-check.ps1` 增加
  `client module deps empty`，并且是对**已安装的那一份**做检查（本次它当场把 0.7.2 判为 FAIL 并打印悬空清单）。
- 新增 `verify/boot-entry.mjs`：解析**正在运行**实例的启动图里本插件自己的条目（依赖是否齐全、url、rev）。
  这个是定位本 bug 的关键工具。
- 测试 54 项。

## 0.7.2

**修复桌面端「颜色无法保存」：用应用自己的设置 RPC 落盘**

- **根因**：桌面端捆绑的客户端**没有 `settingsScope` 这个服务**（0.7.0 因此让应用启动失败，0.7.1 又把它降级成"只存浏览器本地"）。
  实测它的设置界面走的是另一条路：在自己进程里 `super(ctx, "settingsSchema")`，并用
  `ctx.remote.settings.describe() / mutate(ns, ops, expectedRevision)` 直接和主机通信。
- **修复**：`bindColorScope` 现在先找 `settingsScope` 绑定器（CLI/网页版的路径，行为不变），
  找不到就退化到**基于 `remote.settings` 的适配器**：`describe()` 读回本命名空间（含 `revision`）、
  `mutate(ns, [{op:'set', path:['pillColors'], value}], revision)` 写回，主机拒绝时把
  `settings/rejected` 之类的原因如实显示在覆盖栏；`settings/conflict`（revision 过期）会**重新读取后重试一次**。
- **顺带修掉一个真 bug**：写成功后适配器会重新发布读回的值，颜色对象的引用因此改变，
  而保存状态原来用**对象引用**判断"这次写入还是最新的"，于是会一直停在「保存中…」。
  现在改用**编辑代次计数**（每次本地编辑 +1）判断，迟到的写入无法冒领「已保存」。
- **新增 `verify/client-api.mjs`**：读**正在运行**的 DSH 客户端到底提供了什么
  （`super(ctx,"name")` 服务表、`provide` 名称、`remote.*` 命名空间，或按关键词看上下文）。
  这类"CLI 与桌面端内核不同"的坑就是靠它定位的——**猜 API 是 0.7.0 出事的根本原因**。
- **测试 53 项**：新增「只有 remote.settings 时也能读回并写入配色（含 revision 栅栏）」、
  「写入被拒会如实报错而不是吞掉」、「revision 冲突会重读并重试一次」、
  「有 settingsScope 时优先用它，不走 RPC」。

## 0.7.1

**修复 0.7.0 导致桌面端无法启动（`web boot: 1 entry did not activate`）**

- **根因**：浏览器半部把 `settingsScope` 列为**必需服务**，而桌面端**捆绑的客户端**不提供它，
  条目于是停在 `pending`；桌面端会因此**中止整个启动**并弹出「应用无法启动或已意外停止」。
  CLI 组合里这个服务存在，所以 0.7.0 的探针自检没发现——**探针用的是 CLI 的内核，不是应用的内核**。
- **修复**：**两半都不再声明任何必需服务**（`inject = []`）。`peakCost` 投影、设置段、
  自动压缩护栏、余额路由、两套字典、四个胶囊 slot 全部改由 `ctx.inject` 子纤程按需挂载——
  子纤程在等待期间**不会**把条目标记为 pending，因此插件永远不会成为应用启动失败的原因。
- **降级路径保留**：没有 `settingsScope` 时配色存浏览器本地并如实提示；没有 `modelDirectories` 时
  时段胶囊按「视为 DeepSeek」渲染；某个 slot 在新客户端不存在时只损失那一处界面。
- **自检新增三项**：① 两半的 `inject` 必须为空（静态不变量，直接拦住这类故障）；
  ② 应用 crash 日志不得在**本次安装的构建之后**再提到本插件（旧的崩溃不算，新的立刻 FAIL）；
  ③ 桌面探针只保留共享 `profiles/node_modules` 能解析的 bundle——应用私有 bundle
  `@deepseek-ai/dsh-experimental-agent-team-profile` 来自它的 asar，CLI 解析不到会让探针启动失败。
- **测试 49 项**：新增「没有 `settingsScope` / `modelDirectories` 时四个胶囊仍挂载」的回归测试，
  以及「某个 slot 消失只损失那一处界面」。
- 桌面组合实测（应用同款组合 + 真实浏览器）：四个胶囊全部渲染，
  `本会话 ¥0.31 · 余额 ¥17.22` · `💤 闲时 · 9 小时 30 分钟 后切换` · `本轮 ¥0.31` · `余额 ¥17.22`。

## 0.7.0

**适配 DSH 桌面端（Electron），并让插件在更新的 bundled 内核上优雅降级**

- **桌面端安装**：桌面端运行的是应用私有 profile `desktop`（CLI 明确拒绝组合它：
  `profile "desktop" is managed exclusively by the Electron application`）。`install.ps1 -Profile desktop`
  把包放进 `<profile>/node_modules` 并挂载插件行；`install.ps1` 顺带把该 profile 的
  `dsh.profile.patchReload` 设为 `live`，此后的 patch 修改（含升级插件）无需重启应用。
- **首次挂载需要重启一次应用**：应用在启动时组合 profile。自检因此把这种情况报成
  `[WAIT] desktop app live mount`（附重启提示），而不是失败。
- **只剩一个硬依赖**：宿主半部原来把 `sessionProjections` / `tokenMeter` / `loader` / `settings`
  全列为必需服务，任一改名就会让插件卡在 `pending`。现在只有 `sessionProjections` 必需，
  `settings` 与 `loader`（连同 `tokenMeter`）改由 `ctx.inject` 子纤程按需挂载；余额路由本来就在
  `ctx.inject(["connection"])` 里。新增测试覆盖“没有 settings / loader / tokenMeter 时仍拿到胶囊与路由”。
- **浏览器半部逐 slot 注册**：六个 slot 现在各自 try/catch，新客户端里某个 slot 不存在时只损失那一处
  界面（例如只剩设置卡缺失），不会让整个浏览器半部失效。新增对应测试。
- **自检新增第 6 节（桌面端）**：检查 profile 上的包、唯一插件行、`patchReload: live`、无历史行；
  把 profile 复制成 `desktop-probe` 探针实例冷启动（余额路由 200 / 启动图含本插件 / 客户端包 6 个组件），
  跑完拆实例、删探针、还原 `storages`；最后探测**正在运行的应用**端口是否已伺服插件包。
  新增 `[WAIT]` 报告类型与结尾的 pending 汇总，退出码语义不变（无失败即 0）。
- **新增 `verify/desktop-shot.ps1`**：把同一份探针组合开进无头 Edge，打开已有会话并截图头部胶囊，
  用于桌面组合的真实渲染核对。
- 桌面端实测（应用 0.2.0-rc.2，浅色模式）：`本会话 ¥0.31 · 余额 ¥19.04` ·
  `💤 闲时 · 1 小时 4 分钟 后切换` · `本轮 ¥0.31` · `余额 ¥19.04`，余额读取成功。

## 0.6.1

- 打包修正：LICENSE 改为标准 MIT 文本（单一版权行，GitHub 可正确识别为 MIT）并随包分发 CHANGELOG.md。

## 0.6.0

**修复：配色一退出就恢复默认（真正的根因）**

- 客户端设置作用域的写入 API 是 `set(field, value)`（或原子 `mutate(ops)`），**不存在** `write({ op, path, value })`。
  调用一个不存在的方法既不报错也不写入，因此配色看起来已保存、刷新后却回到默认。
- 写入口现在按 `set → mutate → write` 依次探测可用写法，并读取快照的 `writable` 判断连接是否接受写入。
- 同一文件里的自动压缩设置卡也用了同一个错误调用，一并修正（该卡片此前实际不生效）。
- 新增**显式「保存」按钮**与状态行：`保存中…` / `已保存` / `已存本机（主机未接受…）` / `保存失败：{原因}`，
  不再静默失败。
- 新增**浏览器本地副本**兜底：主机写入不可用时保存在浏览器内，保证刷新/重进不丢配色；
  主机写入成功即丢弃副本，设置文档始终是唯一权威。
- 闲时徽标的表情由 🌙 改为 💤。

## 0.5.0

- 会话头部改为 **「本会话花费 · 余额」合并胶囊**（`·` 分隔，order 20），
  **当前时段状态单列一枚**置于其右侧（order 21）。
- 任一项缺失时只显示存在的那一项（尚无花费 → 只显示余额；余额读不到 → `余额 —`）。
- 合并胶囊按余额状态着色，峰谷红/绿回归时段胶囊；覆盖栏中两枚胶囊的标题同步更新。

## 0.4.0

- **0.5 秒悬停意图**：光标需在胶囊上停留 0.5 秒才弹出覆盖栏（离开 240ms 收起，提前离开则取消）。
- **三档配色预设**：默认（插件自带配色，等同原「恢复默认」）/ 深色（Catppuccin Frappé `#414559`）/
  浅白（Catppuccin Latte `#EFF1F5`），与深浅模式配色一致，当前生效项高亮。
- 预设与调色共用「整体 / 单个」作用域。

## 0.3.2

- 修复轮盘被画成圆角方形导致的**颜色与形状错位**：皮肤在 `*` 上设置了
  `corner-shape: superellipse(1.5)`，会把每个 `border-radius: 50%` 变成超椭圆；轮盘与圆点显式 `corner-shape: round`。
- 修复圆盘外缘的错色细边：`background` 简写会重置 `background-clip`，改用
  `background-image` + `background-clip/origin: padding-box`。
- 新增真浏览器验证工具 `verify/shot.mjs`（DevTools 协议截图、悬停、按坐标裁剪放大）。

## 0.3.1

- 修复面板右侧溢出：`range` 输入有固有最小宽度，flex 项需 `min-width: 0` 才能收缩。
- 轮盘的白色饱和度渐变改用 `closest-side`，消除四角留白。
- 「整体 / 单个」改为带滑动动画的开关，选中项使用主题反色，去掉与底色的对比度冲突。
- 头部余额的覆盖栏右上角新增**官方充值页**入口（`platform.deepseek.com/top_up`）。

## 0.3.0

- 新增悬停**配色覆盖栏**：RGB 轮盘 + 明度/R/G/B 滑块，文字色/边框色/背景色分别调整，
  支持整体或单个胶囊调色；覆盖栏配色全部取自主题变量，跟随当前皮肤。
- 配色写入插件设置段 `cost-balance-indicator.pillColors`（300ms 防抖）。
- 非法颜色（非 `#rgb`/`#rrggbb`）一律丢弃。

## 0.2.0

- `dsh-peak-indicator` 与 `dsh-balance-indicator` **合并为一个包**：一份 `peakCost` 投影 + 自动压缩护栏 +
  受鉴权保护的 `GET /api/deepseek.balance` 路由。
- 余额路由改由 `ctx.inject(["connection"], …)` 挂载，凭证库用 `ctx.get("credentials")` 惰性读取，
  因此没有 Web 载体的组合里计价半边照常工作。
- `install.ps1` 提供安装/换装/卸载，采用**两段式**写入（先退役旧行、再插入新行）避开热重载竞态；
  检测到 profile 以 bundle 方式挂载时不再重复插入行（重复 id 会导致启动失败）。
- 新增 `verify/self-check.ps1`（19 项自检）与 `verify/check-cost-balance.mjs`（端到端探针）。
