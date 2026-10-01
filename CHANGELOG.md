# Changelog

版本号遵循语义化版本；每个条目都是一次可复现的改动，配套 `npm test` 与 `verify/self-check.ps1`。

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
