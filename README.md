# dsh-cost-balance-indicator

**DSH Web 的花费 / 余额 / 时段指示器**：会话头部一处显示「本会话花费 · Key 余额」，右侧单列当前峰谷时段；
每轮末尾显示本轮 token 费用与余额；四枚胶囊的文字色、边框色、背景色都能按喜好自定义，并带深色 / 浅白预设。

## 简介

- **它做什么**：把 DeepSeek API 的**消费**（本会话累计、本轮单轮）与 **Key 余额**放在你每天都会看的位置，
  顺带标出当前是**高峰**还是**闲时**（含到下次切换的倒计时），让你在花钱和余额之间不用来回切页面。
- **数据从哪来**：
  - 花费：重放会话日志里的真实 token 用量，按**每条用量事件自身时间戳**所处的峰谷价计价（含缓存命中价）；
  - 余额：官方 `GET /user/balance`，由**主机侧**携带密钥调用（`config.apiKey` → 环境变量 → `ctx.credentials` 凭证库），
    **密钥不会进入浏览器**；主机侧缓存 20s、并发去重、失败时回退上一次成功值；
  - 价格表：DeepSeek 官方价格页（人民币 / 百万 tokens），见 `lib/index.js` 的 `MODEL_PRICES`；
  - 时段规则：北京时间工作日 09:00–12:00、14:00–18:00 为高峰，其余与周末全天为闲时（闲时为高峰半价）。
- **额外能力**：可选的自动压缩成本护栏（默认开启，长会话达到 token 预算即折叠旧上下文）；
  悬停任一胶囊 0.5 秒弹出**配色覆盖栏**（RGB 轮盘 + 明度/RGB 滑块，整体或单个调色，三档预设，自动保存）。
- **环境要求**：DSH `>= 0.1.0-rc.7` 的 `web` profile、Node `>= 22.13.0`。
- **安装**：见 [安装](#安装)；一分钟内可 `pwsh -File install.ps1` 装好，`-Uninstall` 可完整回退。
- **授权与归属**：MIT。本包**包含** [`dsh-peak-indicator`](https://github.com/future007s/dsh-peak-indicator)
  0.1.26（MIT，© 2026 Jim）的代码，并保留其版权声明；完整说明见 [NOTICE](NOTICE)。
- **免责**：本项目与 DeepSeek、与上游作者均无隶属或背书关系；价格表可能随官方调价而过期，
  余额与费用均为**估算参考**，不构成账单依据。

## 优化项目表（相对原插件）

| # | 项目 | 原 `dsh-peak-indicator` | 本插件 |
| --- | --- | --- | --- |
| 1 | 分发形态 | 峰谷/费用与余额是两个独立包、两行插件 | **合并为一个包、一行插件**，杜绝同一个 `peakCost` 投影被注册两次 |
| 2 | 头部信息架构 | 峰谷 + 本会话费用挤在同一枚徽标里 | 「**本会话花费 · 余额**」合并为一枚；**时段状态单列**一枚置于其右侧 |
| 3 | 余额显示 | 无 | 官方 `user/balance` 余额，单位与价格片一致（¥、两位小数） |
| 4 | 余额读取 | — | 主机侧 20s 缓存、并发去重、失败回退上次成功值并标注、`?force=1` 强制刷新 |
| 5 | 配色 | 固定绿 / 红 | 四枚胶囊的**文字色 / 边框色 / 背景色**均可自定义（RGB 轮盘 + 明度 + R/G/B 滑块） |
| 6 | 调色范围 | — | **整体**（四枚一起）或**单个**（只改当前这枚），带滑块动画的切换 |
| 7 | 预设 | — | **默认**（插件自带）/ **深色**（`#414559`）/ **浅白**（`#EFF1F5`），与深浅模式配色一致 |
| 8 | 悬停交互 | 悬停立即弹出 | **0.5 秒悬停意图**才弹出，离开 240ms 收起，扫过时不再打断阅读 |
| 9 | 覆盖栏主题 | 固定深色 rgba | 全部取自主题变量 `--dsw-alias-*`，**跟随当前皮肤**（含第三方主题） |
| 10 | 保存 / 持久化 | 设置卡写入口用了客户端不存在的 API，改动实际不生效 | 自动保存 + **显式「保存」按钮** + 状态如实回报；主机设置为权威、浏览器副本兜底 |
| 11 | 自动压缩设置卡 | 同上，写入口失效 | 写入口修正为 `set(field, value)`，卡片真正可用 |
| 12 | 兼容性修复 | — | `settingsNamespace` 垫片（core 0.1.2+ 不再导出）；皮肤 `corner-shape: superellipse` 下强制轮盘正圆；`background` 简写会重置 `background-clip`；写设置为 `set/mutate` 而非 `write` |
| 13 | 安装 / 换装 | 手动编辑 patch 文件 | `install.ps1`：复制 → 挂载 → 退役旧行，**两段式**写入避开热重载竞态；`-Uninstall` 回退 |
| 14 | 自检与可视化 | — | `verify/self-check.ps1`（19 项，含冷启动）、`shot.mjs`（真浏览器截图/悬停）、`boot-graph.mjs`（启动图核对） |
| 15 | 测试 | 无 | **46 项**（主机 16 + 浏览器 30），含一次真实余额读取 |

## 合并来源

| 合并来源 | 版本 | 贡献 |
| --- | --- | --- |
| [`dsh-peak-indicator`](https://github.com/future007s/dsh-peak-indicator) | 0.1.26（MIT，© 2026 Jim） | 峰谷时段判定与人民币价格表、`peakCost` 会话费用投影、自动压缩成本护栏、会话头部峰谷徽标、每轮 token 价格片、设置卡片 |
| `dsh-balance-indicator` | 0.1.0 | DeepSeek Key 余额读取（受鉴权的主机路由 + 凭证库解析）、余额胶囊与共享轮询 store |

两者的授权与本地改动记录见 [NOTICE](NOTICE)；原来的 `settingsNamespace` 兼容垫片与人民币价格表都已并入。
版本历史见 [CHANGELOG.md](CHANGELOG.md)。

## 一个插件，四个界面

```
会话头部：  [标准模式] [本会话 ¥0.94 · 余额 ¥30.31] [💤 闲时 · 43 小时 11 分钟 后切换]
每轮末尾：  [复制] [本轮 ¥0.08] [余额 ¥30.31]
设置页：    成本与上下文（自动压缩开关 / 触发预算 / 保留 tokens）
```

四处胶囊依次是：**头部花费·余额**（合并）、**头部时段**、**本轮费用**、**本轮余额**。
把光标移到任意一枚胶囊上停 0.5 秒，就会弹出带 RGB 轮盘的配色覆盖栏（见下）。

- **会话头部**：**把「本会话花费」和「余额总量」合并成一枚胶囊**，两项之间用 `·` 分隔
  （`本会话 ¥0.94 · 余额 ¥30.31`，order 20）；**当前时段状态单列成一枚胶囊放在它右侧**
  （`💤 闲时 · 43 小时 11 分钟 后切换`，order 21）。两项各自缺失时只显示有的那一项：
  还没花钱就只显示余额，余额读不到就显示 `余额 —`。
- **每轮末尾**：token 价格片（order 100）之后紧跟余额胶囊（order 101，右侧）。
- 四枚胶囊**同配色、同纵向尺寸**：`fontSize 12 / fontWeight 600 / lineHeight 18px /
  padding 1px 8px / borderRadius 999 / 1px 边框`（总高 22px），同一 flex 行 `align-items:center` 对齐；
  单位一致（人民币元、`¥`、两位小数）。
  - 正常 → 闲时绿（`#0f7b3d` on `#d9f2e2`，边框 `#7fd6a8`）
  - **头部花费·余额**在余额低于阈值时 → 高峰红（`#ffffff` on `#e5484d`）；**头部时段**在高峰时段时同为红色
  - 读不到 → 同几何中性灰（`#667085` on `#eef0f2`）

## 悬停配色（四枚胶囊均可自定义）

光标悬停到任意胶囊上 → 弹出**覆盖栏**：

```
┌──────────────────────────────────────────┐
│ 胶囊配色        头部花费·余额    [充值]   │  ← 仅头部花费·余额有充值入口
│ 预设 [默认] [深色] [浅白]                 │  ← 三档预设（默认 = 保留插件自带配色）
│ [文字色] [边框色] [背景色]                │  ← 三个属性分别调
│  ╭───────╮   明度 ▬▬▬●▬  100            │
│  │ RGB轮盘│   R    ▬●▬▬▬  15            │
│  │   ●   │   G    ▬▬▬▬●  123           │
│  ╰───────╯   B    ▬▬●▬▬  61            │
│              ■ #0F7B3D                   │
│      [ 单个 ][●整体 ]                     │  ← 左=单个，右=整体（默认右侧，滑块动画）
│  预览 [余额 ✓]        [已保存][保存][重置] │
│  …原有的悬停明细文字（余额/价格/时段）…   │
└──────────────────────────────────────────┘
```

- **0.5 秒悬停意图**：光标要在胶囊上**停 0.5 秒**，覆盖栏才出现（`HOVER_OPEN_MS = 500`）；
  从胶囊移到覆盖栏、在覆盖栏里操作都不会让它消失，离开 240ms 后才收起。
  扫过顶栏或某轮统计行时不会再被弹窗打断。
- **三档预设**（覆盖栏顶部，与"整体/单个"共用作用域）：

  | 预设 | 效果 | 取值（文字 / 边框 / 背景） |
  | --- | --- | --- |
  | 默认 | 保留插件自带配色 —— **就是原来的「恢复默认」行为**：峰谷绿/红、余额低于阈值变红、读不到变灰 | 清空自定义，无固定色 |
  | 深色 | 与深色模式一致 | `#C6D0F5` / `#626880` / `#414559` |
  | 浅白 | 与浅色模式一致 | `#4C4F69` / `#BCC0CC` / `#EFF1F5` |

  深色 / 浅白取自当前皮肤的深色（Catppuccin **Frappé**）与浅色（**Latte**）面板色 ——
  背景是对应的 `--dsw-alias-bg-layer-3`，文字是 `--dsw-alias-label-primary`，边框是同一套 surface 边框 ——
  所以在对应模式里读起来像原生控件。当前生效的预设会高亮，手改任一颜色后高亮自然消失；
  预设是普通 hex，选完还能继续用轮盘微调。

- **RGB 调色轮盘**：色相环 + 饱和度（点/拖轮盘即改色），旁边是 **明度** 与 **R/G/B** 滑块（0–255）
  和色值预览 `#RRGGBB`；三者联动（内部用 HSV↔RGB 互转）。
- **文字色 / 边框色 / 背景色**：三个属性分开调，互不影响。
- **整体 / 单个**：一个带**滑动动画**的开关，左侧是「单个」（只改当前这一枚），右侧是「整体」（四枚一起改），
  **默认停在右侧=整体**；选中项底色用主题 accent、文字用主题反色
  （`--dsw-alias-brand-primary` + `--dsw-alias-label-primary-inverted`），选中文字不会与滑块底色撞色。
  整体调色写入 `all`，单个调色写入对应胶囊；显示优先级是
  「本胶囊自定义字段 → `all` 整体 → 内置状态色」，所以整体调完还能单独微调某一枚。
- **头部余额覆盖栏右上角有「充值」**：新标签打开官方充值页
  <https://platform.deepseek.com/top_up>；其余三枚胶囊不显示该入口。
- **覆盖栏配色跟随当前皮肤**：底色/文字/边框/强调色全部取自主题变量
  `--dsw-alias-bg-layer-3` / `--dsw-alias-label-primary` / `--dsw-alias-border-l2` / `--dsw-alias-brand-primary`
  等，因此 catppuccin（或默认皮肤）换肤后覆盖栏自动跟着变，不写死颜色。
- **布局不溢出**：滑块是 `min-width: 0` 的 flex 项 —— `range` 输入自带固有最小宽度，不解除会把右侧数字挤出边框。
- **轮盘必须是正圆（否则颜色和形状对不上）**：皮肤在 `*, ::before, ::after` 上设了
  `corner-shape: var(--dsw-corner-shape)`，值为 `superellipse(1.5)` —— 这会把**每个**
  `border-radius: 50%` 画成圆角方形（应用自己的圆点、开关滑块都显式写 `corner-shape: round` 来豁免）。
  轮盘的色相环本身就是圆的，所以这里也必须写 `corner-shape: round`；否则圆形色环套在圆角方形容器里，
  四角会露出完全饱和的错位色相 —— 这正是「颜色对齐搞错了」的根因。
- **渐变必须写成长属性**：`background` 是简写，会重置它覆盖的所有长属性。若 `background` 写在
  `background-clip` 之后，clip 会被悄悄改回 `border-box`，渐变渗到半透明边框下，圆盘外缘多出一圈错色细边。
  因此轮盘用 `background-image` + `background-clip: padding-box` + `background-origin: padding-box`。
- **原有明细不丢**：价格明细、余额明细、时段与北京时间等原悬停文字移到了覆盖栏底部。
- **保存与持久化**：配色**自动保存**（改动后 300ms 防抖写入），覆盖栏里另有 **「保存」** 按钮可立即写入，
  并在下方用一行状态如实回报：

  | 状态 | 含义 |
  | --- | --- |
  | 保存中… | 正在写入主机设置 |
  | 已保存 | 已写入 `~/.dsh/settings.yaml`（按钮短暂变绿并显示「已保存」） |
  | 已存本机（主机未接受…） | 连接/主机不接受写入（例如 memory 模式），配色改存浏览器本地 |
  | 保存失败：{原因} | 主机拒绝，原因照原样显示 |

  两层存储：**主机设置文档是唯一权威**（写成功即丢弃浏览器副本，多标签页共享）；浏览器副本只在写入不可用时
  兜底，保证**退出再进入不会丢配色**。选择「默认」预设会同时清掉两层。
- **写设置的 API 是 `set(field, value)`（或原子 `mutate(ops)`），不是 `write({op,path,value})`**：
  这一版客户端没有 `write`，旧写法**不会报错也不会写入**——配色看着改好了、一刷新就回到默认，
  正是这个原因。本插件现在按 `set → mutate → write` 依次探测可用写法，主机不可写时直接转本地兜底并如实提示；
  同文件里的自动压缩设置卡也顺带修好了（它原来也用错了 API）。
- **无法解析的颜色一律丢弃**（只接受 `#rgb`/`#rrggbb`），避免把任意字符串写进样式。

## 与两个旧插件的关系

**不要同时挂载**：本包与原 `dsh-peak-indicator` 会注册同一个 `peakCost` 会话投影。
`install.ps1` 会自动处理：

1. 把包复制到 `<profile>/node_modules/dsh-cost-balance-indicator`；
2. 在 profile 的 `cordis.patch.yml` 里插入 `cost-balance-indicator` 行；
3. 把 bundle 提供的 `peak-indicator` 行改为 `disabled: true`（不卸载 bundle，只停用这一行）；
4. 删除独立余额插件留下的 `balance-indicator` 行。

所有被改动的文件先备份到 `<profile>\.cost-balance-backup\`。

```powershell
pwsh -File install.ps1                  # 装进 web profile
pwsh -File install.ps1 -Profile headless
pwsh -File install.ps1 -Uninstall       # 撤回（旧插件原封不动）
```

`web` profile 是 `patchReload: live`：保存 patch 文件即热挂载，**不用重启 DSH**，刷新浏览器即可。
`startup` profile 需要重启。

### 换装时的竞态（安装脚本已处理）

如果 profile 里还挂着旧插件，**不要**在同一个 patch 写入里既禁用旧行又插入新行：
旧插件此刻仍持有 `peakCost` 投影和 `peakCompactStats` 服务，新插件的 `apply` 会中止，
结果就是浏览器端徽标出现了、主机端路由却没注册（余额显示成灰色 `余额 —`）。
安装脚本因此把换装拆成**两次写入**：先只退役旧行，等 `-SettleSeconds`（默认 5 秒）让热重载落地，
再插入新行。冷启动不存在这个竞态（被禁用的行根本不会激活）。

```powershell
pwsh -File install.ps1 -SettleSeconds 8     # 机器慢 / profile 大时放宽等待
```

如果 profile 是用 `dsh.profile.bundles` 挂载本包的（此时插入来自 bundle patch，无法拆分），
换装建议直接重启 DSH。

想随 `dsh plugin` / pnpm 长期留存，可在 profile 的 `package.json` 里再声明：

```json
{
  "dependencies": { "dsh-cost-balance-indicator": "file:<本包所在目录>" },
  "dsh": { "profile": { "bundles": ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "...", "dsh-cost-balance-indicator"] } }
}
```

代价：`bundles` 里声明了却装不上会让整个 profile 启动失败；只用 patch 行的方式最坏只是少一个徽标。

## 配置（可选）

在 profile 的 patch 行里传 `config`，全部可省：

```yaml
- insert:
    - id: cost-balance-indicator
      name: 'dsh-cost-balance-indicator'
      config:
        # —— 计价与自动压缩（原 dsh-peak-indicator）——
        peakWindows: [[9, 12], [14, 18]]
        beijingOffsetMinutes: 480
        offPeakDiscount: 0.5
        policyEffectiveDate: '2026-08-17T00:00:00+08:00'
        weekendOffPeakEffectiveDate: '2026-08-23T00:00:00+08:00'
        prices: {}                 # 自定义模型价格（元/百万 tokens）
        autoCompact:
          enabled: true            # 默认开启；false 关闭
          contextBudget: 100000
          retainTokens: 15000
          referenceWindow: 256000
        # —— 余额（原 dsh-balance-indicator）——
        apiKeyEnv: DEEPSEEK_API_KEY
        lowBalanceThreshold: 5     # 低于该金额（元）变红
        cacheMs: 20000             # 主机侧缓存
        timeoutMs: 10000           # 单次上游超时
        baseUrl: https://api.deepseek.com   # 自建/代理网关
        apiKey: ''                 # 直接给密钥（一般不必）
```

自动压缩开关同时出现在 **设置 → 成本与上下文**（设置命名空间 `cost-balance-indicator`，实时生效）。

## 工作原理

| 半边 | 职责 |
| --- | --- |
| `lib/index.js`（host） | `peakCost` 会话投影（按每条用量事件自身时间戳的峰谷价计价，含缓存命中价，`stateVersion 5`）；自动压缩护栏（通过 loader 配置 `compaction-basic`，记录每步节省）；受 Connection 鉴权保护的 `GET /api/deepseek.balance` 路由 + `deepseekBalance` 服务，密钥按 `config.apiKey` → 环境变量 → `ctx.credentials` 解析，**密钥不进浏览器**；余额缓存 20s、并发去重、失败回退上次成功值 |
| `lib/client.js`（browser） | 峰谷徽标 + 每轮价格片 + 设置卡片（原插件逻辑不变）；余额胶囊注册两次（头部 order 21、轮末 order 101），共用一个模块级 store（整页最多每分钟一次请求），`useSyncExternalStore` 驱动 |

`inject` 只声明 `sessionProjections / tokenMeter / loader / settings`：余额路由在
`ctx.inject(["connection"], …)` 里挂载，凭证库用 `ctx.get("credentials")` 惰性读取，
因此**没有 Web 载体的组合里计价半边照常工作**（只是没有余额徽标）。

## 测试与验证

```powershell
npm test                                        # 46 项：主机 16 + 浏览器 30，含一次真实余额读取
pwsh -File verify/self-check.ps1                # 一键自检：组成树 / open_dsh / 冷启动 / 运行中实例
node verify/check-cost-balance.mjs              # 真实实例端到端探针
node verify/check-cost-balance.mjs --port 51185 # 指定端口（换端口要换 cookie 受众）
node verify/boot-graph.mjs                      # 这一实例的启动图里到底有哪些客户端模块
```

### 浏览器可视化验证（`verify/shot.mjs`）

样式问题（溢出、留白、形状/颜色错位）单元测试看不见，所以自检之外还有一条真浏览器回路：
用 Edge 的 DevTools 协议连到运行中的界面，先点开会话、再把鼠标事件派发到某枚胶囊上把覆盖栏打开，
然后按 CSS 像素裁剪 + 放大截图：

```powershell
# 1. 起一个开着调试端口的 Edge（headless 或普通窗口都行）指向 dsh 打印的带 token 的地址
msedge.exe --headless=new --remote-debugging-port=9222 --user-data-dir=%TEMP%\edge-cbb "http://127.0.0.1:3080/?token=..."
# 2. 打开会话 → 悬停头部余额 → 把轮盘区域放大 4 倍截下来
node verify/shot.mjs --no-cache --reload --out wheel.png `
  --pre-eval-file verify/open-session.js --hover ".dsh-cost-balance-indicator-balance" `
  --clip "555,119,124,124" --scale 4 --eval "getComputedStyle(document.querySelector('[data-cost-balance-colors] div')).borderRadius"
```

`--no-cache`（`Network.setCacheDisabled`）很关键：否则页面会继续执行缓存里的旧 bundle，
改动看起来像没生效。这一回路正是发现上面两个根因的地方 —— 轮盘被画成圆角方形、以及
`background` 简写把 `background-clip` 重置掉，都是只有像素能看出来的。

`verify/self-check.ps1` 是给「装完之后 DSH 还能不能正常打开、有没有冲突」这个问题准备的一键自检，
19 项逐条打印 PASS/FAIL，全过退出码 0：

1. **组成树**：`dsh --profile <p> --dump-config` 退出码 0、本插件行恰好一行、
   `peak-indicator` 带 `disabled: true`、没有遗留的 `balance-indicator` 行；
2. **open_dsh 前置补丁**：`dsh-peak-indicator-compat.ps1` 干净幂等（exit 0）；
3. **open_dsh 自检**：`open_dsh_check.ps1` 10/10、exit 0；
4. **冷启动**：用 open_dsh 里 pin 的同一个核，对**同一个 profile** 在随机空闲端口再起一个实例，
   断言日志无 error/warning、余额路由 200、启动图只有合并插件（旧插件 absent）、
   `/plugins` 包内含 6 个界面组件；随后拆掉第二实例、释放端口、按快照还原 `storages`；
5. **运行中实例**：对 `-LivePort`（默认 3080）上的实例再探一次路由。

```powershell
pwsh -File verify/self-check.ps1 -SkipColdBoot     # 只查组成树与运行中的实例
pwsh -File verify/self-check.ps1 -Profile web -LivePort 3080
```

`verify/boot-graph.mjs` 用来确认「禁用的行真的退出了启动图」：对运行中的实例打印
`dsh-peak-indicator / dsh-balance-indicator / dsh-cost-balance-indicator` 各自 present/absent
（换装后应为 absent / absent / present）。

`npm test` 覆盖：合并后的 Config 默认值、峰谷/周末/旧价表定价、`peakCost` 折叠（含同一 turn/step
的重报替换）、投影注册、无 Web 载体时计价半边仍挂载、自动压缩委派与关闭、余额缓存/强制刷新/失败回退/
错误路径/密钥优先级、设置段 schema 接受浏览器写入的配色、四个界面的槽位与排序（21>20、101>100）、
余额胶囊与价格片的**逐字段几何与色值相等**、两个余额注册用同一组件、共享轮询去重；配色部分还覆盖：
默认无自定义（四枚都用内置状态色）、整体调色改四枚、单个调色只改一枚且全局值仍生效、覆盖栏默认写入
`all`（右侧）、切到「单个」后写入对应胶囊、三个属性分别可调、重置单个/全部、持久化配色被正确采纳、
非法颜色被丢弃、轮盘与 R/G/B/明度滑块存在且联动、滑块可收缩不溢出、轮盘 `corner-shape: round` 强制正圆且只用 background 长属性、滑块开关有动画且选中项用反色、充值入口只出现在头部余额、0.5 秒悬停意图（200ms 不开 / 500ms 开、离开取消）、三档预设的取值与高亮、预设跟随整体/单个作用域、头部合并胶囊的取值/分隔符/缺项降级（没花钱、读不到余额）与时段胶囊不再带 ¥。

`verify/check-cost-balance.mjs` 解决了一个现实问题：`/api` 通道对未鉴权请求一律先返回 401，
curl 分不清「路由没挂」和「没登录」。它用凭证库里的 `client-connection/browser-session` 密钥现场签一枚
浏览器同款 cookie，对照已知路由与余额路由，并检查首页启动图与该插件 `/plugins` 包内的四个组件是否就绪。

测试需要 `@deepseek-ai/schemastery`、`zod`、`@deepseek-ai/cordis`、`react`（peerDependencies）。
在本机 DSH 环境下，包目录里放一个指向 `~/.dsh/profiles/node_modules` 的 `node_modules` 目录联接即可
（已 gitignore）；独立开发时 `npm install` 拉取这些 peer 即可。

## 打包（已完成，未发布）

```powershell
npm run pack        # -> dist/dsh-cost-balance-indicator-0.6.1.tgz
```

发布到 GitHub / npm 的步骤（**本次未执行**，你确认后再跑）：

```powershell
git init; git add -A; git commit -m "dsh-cost-balance-indicator 0.6.1"
gh repo create dsh-cost-balance-indicator --public --source . --push
npm publish --access public     # 需先 npm login；包名 dsh-cost-balance-indicator 在 npm 上未被占用
```

发布前建议确认：LICENSE/NOTICE 保留上游版权声明（MIT 要求）；仓库不要提交 `node_modules/`、`dist/`。

## 已知限制

- **浏览器半部的运行期表现由桩测覆盖**：`test/client.test.mjs` 用最小 React 桩真实执行 bundle 工厂、
  `apply(ctx)` 与全部界面渲染，并逐字段断言几何/色值，但没有真实浏览器像素截图。
- 余额是轮询（60s）+ 主机缓存（20s），刚花掉的钱最多约 1 分钟后反映。
- 价格表来自 DeepSeek 官方页面（2026-09-10 12:00 北京时间生效），调价后需更新 `lib/index.js` 里的
  `MODEL_PRICES`（客户端同表在 `lib/client.js`）。
- 余额徽标与价格片同样遵循统计行显隐：最后一轮常显，历史轮悬停才显示头部与行内元素。
