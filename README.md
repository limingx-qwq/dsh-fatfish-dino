# dsh-fatfish-dino

一个给 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web 界面用的插件：把「蓝色大肥鱼 / 鲸鱼娘 DeepSeek」二创做成**「二选一门」跑酷小游戏**，并按 `dsh-codex-effort` 的 `ctx.slots` 写法，在 DSH **设置左栏新增一个「外观」分区**，内含**全局 UI 外观编辑器**（支持图片 / 视频背景，**铺满整个窗口**而非某个面板）。

零构建、零依赖：原生 ESM + Canvas + 内嵌 WebP，装完刷新页面即可用。

---

## 功能

**① 悬浮球 · 大肥鱼闯门（二选一门玩法）**

- 右下角悬浮球，点击展开游戏面板；可拖动换位置（位置也存本机）
- **玩法**：大肥鱼自动向前冲，途中不断出现**成对的门**，每扇门带一个符号。左上角 HUD 显示**当前目标符号**——用 `←` / `→`（或 `A` / `D`）选跑道，**进与目标一致的那扇门**就得分穿过去，选错直接撞门结束
- 目标符号在每次穿门后更换，走廊随之加速；`空格` / `Enter` 开始或重开，`Esc` 收起，点击画面左半 / 右半也能选跑道
- 伪 3D 前进视角：地平线、走廊透视线、速度横杆、门按远近缩放并高亮正确的那扇
- 得分与**最高分**：`localStorage['ffd.doors.best']`，多标签页通过 `storage` 事件同步；破纪录显示躺平表情包与 🏆 提示
- 悬浮球底部常驻 `HI 00000`；音效可静音（`ffd.doors.mute`），用 WebAudio 合成，无外部音频文件
- 页面切到后台自动暂停，收起面板后重新打开继续

**② 设置左栏 · 外观分区（全局 UI 编辑器）**

按 `dsh-codex-effort` 的写法，用 `ctx.slots.inject('settings.section', ...)` 把插件注册成 DSH **设置面板左栏的一个独立分区「🎨 外观」**，和「模型」「快捷键」等原生分区并列。点开该分区即可看到「大肥鱼 · 全局外观」卡片，以及「大肥鱼跑酷」的**开始游戏**按钮（不用开悬浮球也能玩）。它编辑的是**整个 DSH 界面**：

- **背景类型**：跟随主题 / 纯色 / 渐变（6 组预设 + 自定义起止色与角度）/ **上传图片** / **上传或远程视频**
- **媒体**：`image/*`、`video/*` 本地上传；图片自动压到 1920px WebP，视频原样保存；也支持填远程 `.mp4` / `.jpg` URL。二进制存 **IndexedDB**（`ffd-appearance` / `media`），配置本身存 `localStorage['ffd.appearance.v2']`，刷新后自动恢复 blob URL。视频可设播放速度、静音、循环、暂停，以及 cover/contain、位置和媒体模糊
- **毛玻璃**：开关 + 模糊 0–40px + 饱和度，作用于 DSH 的 `#root`、侧栏、主区、header、设置对话框
- **面板不透明度**（让背景透出来）、**背景压暗**（保证文字可读）、**圆角**、**辉光**
- **应用范围**：全局 UI / 游戏面板 / 悬浮球，可单独关
- **背景铺满整个窗口**：不是只在插件自己的面板里透出来——见下方「全屏背景是怎么做到的」
- **自定义 CSS**：直接写针对你自己 DSH 版本的选择器，用来精确覆盖没被通用规则命中的容器
- 实时预览、`恢复默认`、`导出配置`（复制 JSON）、`导入配置`；卡片右上角 ✕ 折叠

若宿主没有 `settings.section` 槽位（旧版 DSH），插件会自动降级为 `FFD_APPEARANCE.open()` 浮动面板，功能不变。

### 全屏背景是怎么做到的

背景层本身是 `position:fixed; inset:0; z-index:-1` 的整屏图层，但**光有它不够**：DSH 的布局容器是**不透明**的，会把背景整块挡住，于是背景只能从插件自己的面板里透出来，看着就像"某个窗口"。

DSH 把所有界面底色都指向 `body` 上的两个 CSS 变量——`--dsw-alias-bg-base`（主框架 / 中栏 / 右侧栏 / 底部栏）与 `--dsw-specific-sidebar-fill`（侧栏）。这两个变量**只用于背景**，从不做文字色、也不进 `box-shadow`，所以插件直接把它们覆盖成半透明 `rgba()`：

```css
html.ffd-global body {
  --dsw-alias-bg-base: rgba(16, 22, 38, .55) !important;
  --dsw-specific-sidebar-fill: rgba(16, 22, 38, .55) !important;
}
```

这样**一处改动就让整个窗口的所有表面统一透出背景**，而不是逐个猜 DSH 的哈希类名（`.mP3x-q_frame` 之类每个版本都不同）。毛玻璃则只在 `#root` 上做**一次** `backdrop-filter`，避免多层叠加把画面糊死。

不同 DSH 构建的 DOM 差异较大，变量覆盖覆盖不到的地方请用「自定义 CSS」补。

---

## 素材来源与考据

| 来源                                                                 | 用法                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [百度贴吧《大肥鱼好可爱》p/10940077462](https://tieba.baidu.com/p/10940077462) | 帖子为求「大肥鱼」美图，回复是「dd」「我也想要，不过估计今天没心思发吧。新模型太区了」「dd」。帖子本身没有附图（只有「楼主」标签和 Lv.8 徽章），因此按它指向的「蓝色大肥鱼 / 鲸鱼娘 DeepSeek」同人表情包梗重新绘制角色贴纸，风格取 Q 版、白描边、蓝白配色、无字贴纸。                                                                                                                   |
| AI 生成                                                              | `assets/hero.png`、`obstacle.png`、`gameover.png`、`ball.png`：主角、Bug 仙人掌、躺平表情包、悬浮球头像。生成器返回的「透明底」实际是画进像素的灰白棋盘格（RGB PNG，无 alpha），所以用 `tools/matting.py` 的边界 flood-fill 抠成真 RGBA（`*.rgba.png`），再压成 192×192 无损 WebP 后 base64 内嵌到 `client/art.js`（约 139 KB），运行时不请求任何外部资源。 |

视频截帧产物保留在工作区 `../research/frames/f_01.png` … `f_16.png`（0.0s → 7.5s），拼图见 `../research/contact.png`。

> 角色为粉丝二创，与 DeepSeek 官方无关。请在非商业、遵守原二创约定的范围内使用。

---

## 安装

CLI Web 版（把 `web` 换成你的 profile 名）：

```bash
dsh plugin --profile web add D:/Desktop/Fun-dsh/dsh-fatfish-dino
dsh --profile web --dump-config     # 应能看到 # == dsh-fatfish-dino 层
dsh --profile web                  # 然后刷新浏览器
```

桌面版：侧栏「插件 → 添加插件」填入包的**绝对路径**，安装后重启一次 DSH。

从 Git 安装时请固定 commit；本包不含 `prepare` 脚本、不需要构建授权。

卸载：

```bash
dsh plugin --profile web remove dsh-fatfish-dino
```

---

## 目录结构

```
dsh-fatfish-dino/
├── package.json              # manifestVersion 1 + dsh.bundle + dsh.client(immediately)
├── client.js                 # ★ 运行时入口：自包含单文件，window.__ModuleLoader__.load(...)
├── cordis.patch.yml          # 向 profile 插入插件行
├── index.js                  # 服务端插件行（无副作用）
├── client/                   # 源码（由 tools/build-client.py 合并成 client.js）
│   ├── index.js              # 官方 ESM apply(ctx) 形态（备选，适配其他 DSH 版本）
│   ├── art.js                # 内嵌 WebP data URI（自动生成）
│   ├── styles.js             # 全部样式，作用域 .ffd-*
│   ├── doors.js              # 闯门引擎（Canvas，伪 3D 前进视角）
│   ├── appearance.js         # 全局 UI 编辑器 + 图片/视频背景（含 mountCard 供槽位挂载）
│   └── slots.js              # ★ DSH 0.2.x 槽位注册（仿 dsh-codex-effort）：settings.section 左栏分区 + 快捷按钮
├── assets/                   # 原始 PNG + 抠图后 RGBA + 压缩 WebP + 预览拼图
├── tools/matting.py          # 棋盘格背景抠图脚本（可复现素材处理）
├── tools/build-client.py     # 把 client/*.js 打包成自包含 client.js
├── demo/index.html           # 独立可玩预览，双击即可打开
└── README.md
```

`client/*.js` 都是"副作用脚本 + 全局命名空间"（`FFD_ART` / `FFD_CSS` / `FFD_DOORS` / `FFD_APPEARANCE`），所以既能被 demo 用普通 `<script>` 加载（`file://` 可跑），也能被合并成单文件入口。

**运行时入口以 `client.js` 为准**：本机 DSH Desktop 0.2.1-rc.3 的 Web 客户端用 `window.__ModuleLoader__.load({ id, factory })` 加载插件，factory 返回 `{ apply, inject }`，且入口里的相对 `import` 不会被解析 —— 所以必须自包含。改动 `client/*.js` 后运行 `python tools/build-client.py` 重新生成。

`client/slots.js` 是 DSH 0.2.x 的接入层，仿 `dsh-codex-effort`：在 `apply(ctx)` 里用 `ctx.slots.inject('settings.section', ...)` 注册 React 组件（分区头部「🎨 外观」+「大肥鱼闯门」开始按钮 + 外观卡片挂载点），并额外在左栏底部 / 会话头部注入快捷按钮。`ctx.effect` 负责卸载清理。找不到 `settings.section` 槽位或没有 React 时，自动降级为「悬浮球外观浮层」。`client/index.js` 保留的是官方文档里的 ESM `apply(ctx)` 形态，供其他 DSH 版本使用。

---

## 独立预览

直接用浏览器打开 `demo/index.html`（无需安装 DSH、无需起服务器）。页面模拟了 DSH 的深色界面：**点左侧栏「🎨 外观」分区**，即可看到「大肥鱼 · 全局外观」卡片与「大肥鱼闯门」开始按钮（这正对应真实 DSH 里 `settings.section` 槽位注入的左栏分区）。另有右下角悬浮球（常驻的闯门入口）。

URL 参数：`?showcase=doors` / `play` 展开游戏面板或直接开跑；`?showcase=appearance` / `glass` / `video` 打开外观设置页，其中 `glass` 自动应用赛博渐变、`video` 用工作区里的 `research/clip.mp4` 演示视频背景。

已用无头 Edge 端到端验证：卡片注入到 `#settings-body [role=tabpanel]`；游戏计分与 `ffd.doors.best` 落盘；上传的 PNG 压缩成 WebP 存入 IndexedDB、刷新后 blob URL 恢复成功；全局渐变 / 视频背景 / `html.ffd-global` 与注入 CSS 均生效；零控制台错误。

**游戏判定逻辑**用固定随机种子做过自动化验证（`research/verify-game.html`）：把 `Math.random()` 固定成 0，此时每对门的正确门恒在左侧——按住 `←` 应持续得分并存活，按住 `→` 应撞门结束。两种情况均符合预期（存活局得分 00059，撞门局 00018 结束）。

**全屏背景**同样做了断言（`research/verify-game.html` 内置了仿 DSH 布局：`.mP3x-q_frame` / `_centerCol` / `_sidebarCol` 全部以 `var(--dsw-alias-bg-base)` 绘制）：开启渐变背景后，读取三者的 `getComputedStyle().backgroundColor`，均变为 `rgba(16, 22, 38, 0.55)`，`body` 为全透明——证明背景确实铺满整个窗口而非某个面板。

也可以起静态服务：

```bash
cd D:/Desktop/Fun-dsh/dsh-fatfish-dino
npx serve .
```

---

## 兼容性与边界发,

- 面向 DSH `>=0.2.0 <0.3.0`（`engines.dsh`）。若你的版本被拒绝，按需放宽 `package.json` 的范围。
- 客户端入口声明 `inject: ["slots"]`，让加载器把 `ctx.slots` 注入进来；若宿主没有 `slots` 服务，插件会走降级路径（DOM 嗅探 / 悬浮面版）而不是停在 PENDING。原生控件靠选择器嗅探，不同 DSH 构建的 DOM 差异会走降级药丸。
- 所有 localStorage 读写均带 `try/catch`，隐私模式下不会抛错，只是无法持久化。
- 游戏 canvas 用 `ResizeObserver` 适配容器宽度，支持高 DPI；窄屏面板自动改为左右贴边。
- 插件只注入 DOM / 样式 / 事件，不请求网络、不读取会话内容、不修改模型调用。
