# dsh-fatfish-dino

一个给 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web 界面用的插件：把「蓝色大肥鱼 / 鲸鱼娘 DeepSeek」二创做成**悬浮球跑酷小游戏**，把原生的**思考深度选择器**换成 GPT / Codex 式的**强度拖动条**，并向 DSH 自带的 **「设置 → 外观」** 页注入一个**全局 UI 外观编辑器**（支持图片 / 视频背景）。

零构建、零依赖：原生 ESM + Canvas + 内嵌 WebP，装完刷新页面即可用。

---

## 功能

**① 悬浮球 · 大肥鱼跑酷（Chrome dino 玩法）**

- 右下角悬浮球，点击展开游戏面板；可拖动换位置（位置也存本机）
- `空格` / `↑` / `W` / `点击画面` 跳跃，`↓` / `S` 下蹲，`Esc` 收起
- AI 生成的娘化大肥鱼主角、Bug 仙人掌障碍、180 分后出现的飞鱼、滚动地面与云
- 随分数加速，每 100 分闪屏并切换昼夜配色
- 得分与**最高分**：`localStorage['ffd.dino.best']`，多标签页通过 `storage` 事件同步；破纪录显示躺平表情包与 🏆 提示
- 悬浮球底部常驻 `HI 00000`；音效可静音（`ffd.dino.mute`），用 WebAudio 合成，无外部音频文件
- 页面切到后台自动暂停，收起面板后重新打开继续

**② 思考强度 · GPT / Codex 式拖动条**

复刻自 B 站视频前 8 秒（0.5 秒一帧，共 16 帧）里 GPT-6 输入框的「强度」浮层：

- 白色胶囊轨道 + **蓝 → 紫渐变填充**，右端**燕尾斜切** + 细闪粉
- 白色圆形 thumb，拖动时顶部从「档位名 / 模型副标题」切换为紫色吐槽文案（含视频原句「更快消耗使用额度」）
- 左上 ✦ 星标（高档位变紫发光）、右上 ⟳ 重置、档位刻度、底部 `Select effort ⌄`
- 档位：`轻度 / 标准 / 深度 / 极致 / Ultra`，松开吸附到最近档位，支持 ← → Home End 键盘
- 档位名可点开模型下拉（DeepSeek 深度思考 / 快速回答 / R2 / Codex Spark / GPT-6 Astra 玩梗）
- 通过 `MutationObserver` 自动寻找并覆盖 DSH 原生「思考深度 / reasoning effort」控件；找不到时 1.6 秒后降级为独立悬浮药丸，**不会破坏 React 的 DOM 结构**（只加 class + 覆盖层，不移动节点）
- 持久化 `ffd.effort` / `ffd.effort.value` / `ffd.effort.model`

宿主集成：值变化时会在 `document` 和 `window` 上派发

```js
document.addEventListener('ffd:effort-change', (e) => {
  // e.detail = { level: 'ultra', label: 'Ultra', value: 100, model: 'deepseek-reasoner' }
})
```

若原生控件是 `<select>`，插件会同步它的 `selectedIndex` 并派发 `change`；其他类型的原生控件只做视觉替换，实际模型参数请通过上面的事件接入你的适配器。

**③ 设置 → 外观 · 全局 UI 编辑器**

这一块**不在悬浮球上**（没有齿轮、没有右键菜单、游戏面板也没有设置按钮），而是把「大肥鱼 · 全局外观」卡片注入 DSH 自带设置对话框的**外观 tab**（`[role=tabpanel]` / 内容滚动区），和「主题 / 界面密度」等原生设置项排在一起。它编辑的是**整个 DSH 界面**：

- **背景类型**：跟随主题 / 纯色 / 渐变（6 组预设 + 自定义起止色与角度）/ **上传图片** / **上传或远程视频**
- **媒体**：`image/*`、`video/*` 本地上传；图片自动压到 1920px WebP，视频原样保存；也支持填远程 `.mp4` / `.jpg` URL。二进制存 **IndexedDB**（`ffd-appearance` / `media`），配置本身存 `localStorage['ffd.appearance.v2']`，刷新后自动恢复 blob URL。视频可设播放速度、静音、循环、暂停，以及 cover/contain、位置和媒体模糊
- **毛玻璃**：开关 + 模糊 0–40px + 饱和度，作用于 DSH 的 `#root`、侧栏、主区、header、设置对话框
- **面板不透明度**（让背景透出来）、**背景压暗**（保证文字可读）、**圆角**、**辉光**
- **应用范围**：全局 UI / 游戏面板 / 悬浮球 / 强度浮层，可单独关
- **自定义 CSS**：直接写针对你自己 DSH 版本的选择器，用来精确覆盖没被通用规则命中的容器
- 实时预览、`恢复默认`、`导出配置`（复制 JSON）、`导入配置`；卡片右上角 ✕ 折叠

全局背景层用 `position:fixed; z-index:-1`，配合注入的 `html.ffd-global` 规则把宿主面板改成半透明。不同 DSH 构建的 DOM 差异较大，通用选择器覆盖不到的地方请用「自定义 CSS」补；插件自带 `FFD_APPEARANCE.open()` 浮动面板作为设置页不可用时的兜底。

---

## 素材来源与考据

| 来源 | 用法 |
| --- | --- |
| [百度贴吧《大肥鱼好可爱》p/10940077462](https://tieba.baidu.com/p/10940077462) | 帖子为求「大肥鱼」美图，回复是「dd」「我也想要，不过估计今天没心思发吧。新模型太区了」「dd」。帖子本身没有附图（只有「楼主」标签和 Lv.8 徽章），因此按它指向的「蓝色大肥鱼 / 鲸鱼娘 DeepSeek」同人表情包梗重新绘制角色贴纸，风格取 Q 版、白描边、蓝白配色、无字贴纸。 |
| [B 站 BV1C5YZ69EdX](https://www.bilibili.com/video/BV1C5YZ69EdX/) | 下载视频并以 0.5 秒间隔截取前 8 秒共 16 帧（`research/frames/`），逐帧还原拖动条的轨道、渐变、燕尾末端、档位名、模型副标题、✦ 图标、⟳ 重置、tooltip 与模型下拉。 |
| AI 生成 | `assets/hero.png`、`obstacle.png`、`gameover.png`、`ball.png`：主角、Bug 仙人掌、躺平表情包、悬浮球头像。生成器返回的「透明底」实际是画进像素的灰白棋盘格（RGB PNG，无 alpha），所以用 `tools/matting.py` 的边界 flood-fill 抠成真 RGBA（`*.rgba.png`），再压成 192×192 无损 WebP 后 base64 内嵌到 `client/art.js`（约 139 KB），运行时不请求任何外部资源。 |

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
│   ├── dino.js               # 跑酷引擎（Canvas）
│   ├── effort.js             # 强度拖动条 + 原生控件替换
│   └── appearance.js         # 注入「设置 → 外观」的全局 UI 编辑器 + 图片/视频背景
├── assets/                   # 原始 PNG + 抠图后 RGBA + 压缩 WebP + 预览拼图
├── tools/matting.py          # 棋盘格背景抠图脚本（可复现素材处理）
├── tools/build-client.py     # 把 client/*.js 打包成自包含 client.js
├── demo/index.html           # 独立可玩预览，双击即可打开
└── README.md
```

`client/*.js` 都是"副作用脚本 + 全局命名空间"（`FFD_ART` / `FFD_CSS` / `FFD_DINO` / `FFD_EFFORT` / `FFD_APPEARANCE`），所以既能被 demo 用普通 `<script>` 加载（`file://` 可跑），也能被合并成单文件入口。

**运行时入口以 `client.js` 为准**：本机 DSH Desktop 0.2.1-rc.3 的 Web 客户端用 `window.__ModuleLoader__.load({ id, factory })` 加载插件，factory 返回 `{ apply, inject }`，且入口里的相对 `import` 不会被解析 —— 所以必须自包含。改动 `client/*.js` 后运行 `python tools/build-client.py` 重新生成。`client/index.js` 保留的是官方文档里的 ESM `apply(ctx)` 形态，供其他 DSH 版本使用。

---

## 独立预览

直接用浏览器打开 `demo/index.html`（无需安装 DSH、无需起服务器）。页面模拟了 DSH 的深色界面：**点左侧「🎨 外观」会打开模拟的 DSH 设置对话框**，可以看到插件卡片被注入到「外观」tab 的三个原生设置项下面。另有会被替换的「思考深度」按钮、实时档位指示器和右下角悬浮球。

URL 参数：`?showcase=dino` / `effort` / `play` 展开游戏面板、强度浮层或直接开跑；`?showcase=appearance` / `glass` / `video` 打开外观设置页，其中 `glass` 自动应用赛博渐变、`video` 用工作区里的 `research/clip.mp4` 演示视频背景。

已用无头 Chromium + CDP 端到端验证：卡片注入到 `#settings-body [role=tabpanel]`、页面上 `.ffd-ball-gear` 与 `#ffd-settings` 数量为 0；游戏计分与 `ffd.dino.best` 落盘；强度条调到 `Ultra` 持久化并派发事件；上传的 PNG 压缩成 WebP 存入 IndexedDB、刷新后 blob URL 恢复成功；全局渐变 / 视频背景 / `html.ffd-global` 与注入 CSS 均生效；零控制台错误。

也可以起静态服务：

```bash
cd D:/Desktop/Fun-dsh/dsh-fatfish-dino
npx serve .
```

---

## 兼容性与边界

- 面向 DSH `>=0.2.0 <0.3.0`（`engines.dsh`）。若你的版本被拒绝，按需放宽 `package.json` 的范围。
- 不声明 `inject` 依赖，避免因宿主缺少 UI 服务而一直停在 PENDING；原生控件靠选择器嗅探，不同 DSH 构建的 DOM 差异会走降级药丸。
- 所有 localStorage 读写均带 `try/catch`，隐私模式下不会抛错，只是无法持久化。
- 游戏 canvas 用 `ResizeObserver` 适配容器宽度，支持高 DPI；窄屏面板自动改为左右贴边。
- 插件只注入 DOM / 样式 / 事件，不请求网络、不读取会话内容、不修改模型调用。
