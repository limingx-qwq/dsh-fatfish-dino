/* Fatfish Dino — global UI appearance editor.

   It extends the HOST's own "外观 / Appearance" settings page (DSH settings dialog),
   not the floating ball. The background is applied to the whole DSH interface and
   supports solid colours, gradients, uploaded images and uploaded/remote VIDEO.
   Binary media lives in IndexedDB; only the small config object goes to localStorage. */
(function () {
  'use strict';

  var KEY = 'ffd.appearance.v2';
  var DB_NAME = 'ffd-appearance';
  var STORE = 'media';
  var MEDIA_KEY = 'background';
  var PRESETS = [
    { id: 'ocean', name: '深海', from: '#12306e', to: '#7b3ff2', angle: 135 },
    { id: 'aurora', name: '极光', from: '#0f2027', to: '#00c6a7', angle: 120 },
    { id: 'dawn', name: '晨曦', from: '#ff9a9e', to: '#a18cd1', angle: 135 },
    { id: 'sakura', name: '樱粉', from: '#ffdde1', to: '#ee9ca7', angle: 160 },
    { id: 'cyber', name: '赛博', from: '#14143c', to: '#f72585', angle: 115 },
    { id: 'cream', name: '奶油', from: '#fdfbfb', to: '#c9d6e8', angle: 135 }
  ];
  var DEFAULTS = {
    enabled: true,
    mode: 'theme',             // theme | solid | gradient | image | video
    solid: '#101827',
    from: '#12306e', to: '#7b3ff2', angle: 135, preset: 'ocean',
    remoteUrl: '', mediaKind: '', mediaName: '', hasMedia: false,
    fit: 'cover', position: 'center', mediaBlur: 0,
    videoRate: 1, videoMuted: true, videoLoop: true,
    glass: true, blur: 14, saturate: 140,
    uiAlpha: 55, dim: 25, radius: 16, glow: 40,
    scope: { global: true, panel: true, ball: true, effort: true },
    customCss: ''
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function load() {
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || '{}');
      var s = clone(DEFAULTS);
      Object.keys(DEFAULTS).forEach(function (k) {
        if (raw[k] !== undefined && typeof raw[k] === typeof DEFAULTS[k]) s[k] = raw[k];
      });
      if (raw.scope && typeof raw.scope === 'object') {
        s.scope = {
          global: raw.scope.global !== false, panel: raw.scope.panel !== false,
          ball: raw.scope.ball !== false, effort: raw.scope.effort !== false
        };
      }
      return s;
    } catch (_) { return clone(DEFAULTS); }
  }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (_) {} }
  function clamp(v, a, b) { v = Number(v); return isNaN(v) ? a : v < a ? a : v > b ? b : v; }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function gradientCss(s) { return 'linear-gradient(' + s.angle + 'deg,' + s.from + ' 0%,' + s.to + ' 100%)'; }

  /* ---------- IndexedDB for image / video blobs ---------- */
  function openDB() {
    return new Promise(function (res, rej) {
      if (!globalThis.indexedDB) return rej(new Error('no indexedDB'));
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      };
      req.onsuccess = function () { res(req.result); };
      req.onerror = function () { rej(req.error); };
    });
  }
  function idbPut(blob) {
    return openDB().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(blob, MEDIA_KEY);
        tx.oncomplete = function () { res(true); };
        tx.onerror = function () { rej(tx.error); };
      });
    });
  }
  function idbGet() {
    return openDB().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction(STORE, 'readonly');
        var r = tx.objectStore(STORE).get(MEDIA_KEY);
        r.onsuccess = function () { res(r.result || null); };
        r.onerror = function () { rej(r.error); };
      });
    }).catch(function () { return null; });
  }
  function idbDel() {
    return openDB().then(function (db) {
      return new Promise(function (res) {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(MEDIA_KEY);
        tx.oncomplete = function () { res(true); };
        tx.onerror = function () { res(false); };
      });
    }).catch(function () { return false; });
  }

  function mount(rootEl) {
    var host = rootEl || document.body;
    var ownsBox = false, box = null;
    if (host.classList && host.classList.contains('ffd-root')) box = host;
    else if (host.querySelector) box = host.querySelector('.ffd-root');
    if (!box) { box = el('div', 'ffd-root'); host.appendChild(box); ownsBox = true; }

    var s = load();
    var objectUrl = '';
    var autoInject = true; // slots mode mounts the card into a host-provided React container instead

    /* ---------- global background layer (behind the whole DSH UI) ---------- */
    var bg = el('div', 'ffd-global-bg');
    bg.setAttribute('aria-hidden', 'true');
    bg.innerHTML =
      '<div class="ffd-global-gradient"></div>' +
      '<div class="ffd-global-media"><img alt=""><video playsinline></video></div>' +
      '<div class="ffd-global-scrim"></div>';
    document.body.appendChild(bg);
    var gradEl = bg.querySelector('.ffd-global-gradient');
    var mediaBox = bg.querySelector('.ffd-global-media');
    var imgEl = mediaBox.querySelector('img');
    var videoEl = mediaBox.querySelector('video');
    imgEl.style.display = 'none';
    videoEl.style.display = 'none';

    /* ---------- injected global CSS (host UI translucency) ---------- */
    var uiStyle = document.createElement('style');
    uiStyle.id = 'ffd-global-ui-style';
    document.head.appendChild(uiStyle);

    /* ---------- settings card (injected into the host's Appearance page) ---------- */
    // cardHost carries the .ffd-root scope so all scoped styles / CSS variables work
    // even though the card lives inside the DSH settings dialog, not our overlay root.
    var cardHost = el('div', 'ffd-root ffd-embedded-root');
    var card = el('section', 'ffd-appe-card');
    card.id = 'ffd-appearance-card';
    card.innerHTML = buildUIHTML();
    cardHost.appendChild(card);
    var floating = el('div', 'ffd-appearance');
    floating.hidden = true;
    floating.setAttribute('role', 'dialog');
    floating.setAttribute('aria-label', '全局外观设置');
    floating.innerHTML = '<div class="ffd-bg-layer" aria-hidden="true"></div>' + buildUIHTML();
    box.appendChild(floating);

    function buildUIHTML() {
      return '' +
        '<div class="ffd-appe-head">' +
          '<div><b>大肥鱼 · 全局外观</b><small>编辑 DSH 整个界面，支持图片 / 视频背景</small></div>' +
          '<label class="ffd-appe-enable"><input type="checkbox" data-f="enabled"> 启用</label>' +
          '<button class="ffd-icon-btn ffd-appe-close" type="button" aria-label="收起">✕</button>' +
        '</div>' +
        '<div class="ffd-appe-body">' +
          '<div class="ffd-field"><label>背景类型</label><div class="ffd-seg ffd-mode">' +
            '<button type="button" data-mode="theme">跟随主题</button>' +
            '<button type="button" data-mode="solid">纯色</button>' +
            '<button type="button" data-mode="gradient">渐变</button>' +
            '<button type="button" data-mode="image">图片</button>' +
            '<button type="button" data-mode="video">视频</button>' +
          '</div></div>' +
          '<div class="ffd-row ffd-block-solid"><label>背景色</label><input type="color" data-f="solid"></div>' +
          '<div class="ffd-block-gradient">' +
            '<div class="ffd-field"><label>渐变预设</label><div class="ffd-presets ffd-presets-box"></div></div>' +
            '<div class="ffd-row"><label>起始色</label><input type="color" data-f="from">' +
              '<label>结束色</label><input type="color" data-f="to"></div>' +
            '<div class="ffd-slider-row"><label>角度</label><input type="range" data-f="angle" min="0" max="360" step="5"><output data-out="angle"></output></div>' +
          '</div>' +
          '<div class="ffd-block-media">' +
            '<div class="ffd-row"><label>上传图片 / 视频</label><input type="file" class="ffd-file" accept="image/*,video/*"></div>' +
            '<div class="ffd-row"><label>或远程 URL</label><input type="text" class="ffd-url" placeholder="https://... .mp4 / .jpg"></div>' +
            '<div class="ffd-hint ffd-media-status">未选择媒体。文件存在浏览器 IndexedDB 中，不会上传；视频建议 &lt; 50 MB。</div>' +
            '<div class="ffd-row"><label>填充</label><select class="ffd-fit"><option value="cover">铺满 cover</option><option value="contain">完整 contain</option></select>' +
              '<label>位置</label><select class="ffd-position"><option value="center">居中</option><option value="top">顶部</option><option value="bottom">底部</option></select></div>' +
            '<div class="ffd-slider-row"><label>媒体模糊</label><input type="range" data-f="mediaBlur" min="0" max="24" step="1"><output data-out="mediaBlur"></output></div>' +
            '<div class="ffd-block-video">' +
              '<div class="ffd-slider-row"><label>播放速度</label><input type="range" data-f="videoRate" min="0.25" max="2" step="0.25"><output data-out="videoRate"></output></div>' +
              '<div class="ffd-row"><label><input type="checkbox" data-f="videoMuted"> 静音</label>' +
                '<label><input type="checkbox" data-f="videoLoop"> 循环</label>' +
                '<button type="button" class="ffd-mini ffd-video-toggle">暂停</button></div>' +
            '</div>' +
            '<button type="button" class="ffd-mini ffd-media-clear">清除媒体</button>' +
          '</div>' +
          '<div class="ffd-divider"></div>' +
          '<div class="ffd-row"><label><input type="checkbox" data-f="glass"> 毛玻璃（模糊 DSH 面板背后）</label></div>' +
          '<div class="ffd-slider-row"><label>模糊</label><input type="range" data-f="blur" min="0" max="40" step="1"><output data-out="blur"></output></div>' +
          '<div class="ffd-slider-row"><label>饱和度</label><input type="range" data-f="saturate" min="100" max="200" step="5"><output data-out="saturate"></output></div>' +
          '<div class="ffd-divider"></div>' +
          '<div class="ffd-slider-row"><label>面板不透明度</label><input type="range" data-f="uiAlpha" min="10" max="100" step="1"><output data-out="uiAlpha"></output></div>' +
          '<div class="ffd-slider-row"><label>背景压暗</label><input type="range" data-f="dim" min="0" max="80" step="1"><output data-out="dim"></output></div>' +
          '<div class="ffd-slider-row"><label>圆角</label><input type="range" data-f="radius" min="0" max="32" step="1"><output data-out="radius"></output></div>' +
          '<div class="ffd-slider-row"><label>辉光</label><input type="range" data-f="glow" min="0" max="100" step="1"><output data-out="glow"></output></div>' +
          '<div class="ffd-divider"></div>' +
          '<div class="ffd-field"><label>应用范围</label><div class="ffd-scope">' +
            '<label><input type="checkbox" data-scope="global"> 全局 UI</label>' +
            '<label><input type="checkbox" data-scope="panel"> 游戏面板</label>' +
            '<label><input type="checkbox" data-scope="ball"> 悬浮球</label>' +
            '<label><input type="checkbox" data-scope="effort"> 强度浮层</label>' +
          '</div></div>' +
          '<div class="ffd-field"><label>自定义 CSS（高级，可直接写 DSH 选择器）</label>' +
            '<textarea class="ffd-custom-css" rows="3" placeholder="[data-slot=&#39;main&#39;] { background: transparent !important; }"></textarea></div>' +
        '</div>' +
        '<div class="ffd-appe-foot">' +
          '<button type="button" class="ffd-mini ffd-appe-reset">恢复默认</button>' +
          '<button type="button" class="ffd-mini ffd-appe-export">导出配置</button>' +
          '<button type="button" class="ffd-mini ffd-appe-import">导入配置</button>' +
          '<button type="button" class="ffd-play ffd-appe-done">完成</button>' +
        '</div>';
    }

    // Both surfaces share one controller; `data-f` / `data-scope` / `data-mode` are the hooks.
    var surfaces = [card, floating];
    surfaces.forEach(function (root) {
      PRESETS.forEach(function (p) {
        var b = el('button', '', '<i style="background:linear-gradient(' + p.angle + 'deg,' + p.from + ',' + p.to + ')"></i><span>' + p.name + '</span>');
        b.type = 'button';
        b.setAttribute('data-preset', p.id);
        root.querySelector('.ffd-presets-box').appendChild(b);
      });
    });

    var RANGES = {
      angle: ['angle', '°'], mediaBlur: ['mediaBlur', 'px'], videoRate: ['videoRate', '×'],
      blur: ['blur', 'px'], saturate: ['saturate', '%'], uiAlpha: ['uiAlpha', '%'],
      dim: ['dim', '%'], radius: ['radius', 'px'], glow: ['glow', '%']
    };
    var CHECKS = ['enabled', 'glass', 'videoMuted', 'videoLoop'];

    /* ---------- apply ---------- */
    function applyGlobal() {
      var active = s.enabled && s.mode !== 'theme';
      document.documentElement.classList.toggle('ffd-global', active && s.scope.global);
      bg.classList.toggle('ffd-active', active);
      bg.style.setProperty('--ffd-bg-dim', String(s.dim / 100));
      bg.style.setProperty('--ffd-media-blur', s.mediaBlur + 'px');
      mediaBox.style.objectFit = s.fit;
      mediaBox.style.objectPosition = s.position;
      imgEl.style.objectFit = s.fit; imgEl.style.objectPosition = s.position;
      videoEl.style.objectFit = s.fit; videoEl.style.objectPosition = s.position;
      videoEl.playbackRate = Number(s.videoRate) || 1;
      videoEl.muted = s.videoMuted !== false;
      videoEl.loop = s.videoLoop !== false;

      if (!active) { gradEl.style.background = ''; return; }
      if (s.mode === 'solid') gradEl.style.background = s.solid;
      else if (s.mode === 'gradient') gradEl.style.background = gradientCss(s);
      else gradEl.style.background = 'rgba(8,12,24,.35)';
    }
    function applyMedia() {
      var isMedia = s.mode === 'image' || s.mode === 'video';
      var url = s.remoteUrl || objectUrl;
      var kind = s.remoteUrl ? (s.mode === 'video' || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(s.remoteUrl) ? 'video' : 'image') : s.mediaKind;
      imgEl.style.display = 'none';
      videoEl.style.display = 'none';
      mediaBox.classList.toggle('ffd-has-media', isMedia && !!url);
      if (!isMedia || !url) return;
      if (kind === 'video' || s.mode === 'video') {
        if (videoEl.src !== url) videoEl.src = url;
        videoEl.style.display = 'block';
        var p = videoEl.play();
        if (p && p.catch) p.catch(function () {});
      } else {
        if (imgEl.src !== url) imgEl.src = url;
        imgEl.style.display = 'block';
        videoEl.pause();
      }
    }
    var styleRoots = [box, cardHost];
    function setVar(k, v) { styleRoots.forEach(function (r) { r.style.setProperty(k, v); }); }
    function applyPluginSurfaces() {
      var themed = s.enabled && s.mode !== 'theme';
      var css = themed ? (s.mode === 'gradient' ? gradientCss(s) : s.mode === 'solid' ? s.solid : 'rgba(10,16,32,.55)') : '';
      cardHost.setAttribute('data-ffd-theme', box.getAttribute('data-ffd-theme') || 'dark');
      setVar('--ffd-bg', css || 'var(--ffd-card)');
      setVar('--ffd-bg-alpha', String(clamp(s.uiAlpha, 10, 100) / 100));
      setVar('--ffd-blur', (s.glass ? s.blur : 0) + 'px');
      setVar('--ffd-sat', s.saturate + '%');
      setVar('--ffd-radius', s.radius + 'px');
      setVar('--ffd-dim', String(s.dim / 100));
      setVar('--ffd-glow-px', Math.round(s.glow / 100 * 34) + 'px');
      setVar('--ffd-ball-bg', s.mode === 'gradient' ? gradientCss(s) : (s.mode === 'solid' ? s.solid : 'linear-gradient(145deg,#6ba8ff,#4a63e7 55%,#9b5cf5)'));
      setVar('--ffd-ball-alpha', '1');

      var panel = box.querySelector('.ffd-panel');
      var effortPop = box.querySelector('.ffd-effort-pop');
      var ball = box.querySelector('.ffd-ball');
      if (panel) panel.classList.toggle('ffd-themed', themed && s.scope.panel);
      if (effortPop) effortPop.classList.toggle('ffd-themed', themed && s.scope.effort);
      if (ball) ball.classList.toggle('ffd-themed', themed && s.scope.ball);
      floating.classList.toggle('ffd-themed', themed);
      card.classList.toggle('ffd-themed', themed);
    }
    function applyHostCss() {
      var tint = document.documentElement.getAttribute('data-theme') === 'dark' ||
        document.documentElement.getAttribute('data-ds-dark-theme') === 'true' ||
        document.documentElement.classList.contains('dark') ||
        (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
        ? '16, 22, 38' : '250, 252, 255';
      var alpha = clamp(s.uiAlpha, 10, 100) / 100;
      var blur = s.glass ? s.blur : 0;
      uiStyle.textContent =
        'html.ffd-global, html.ffd-global body { background: transparent !important; }' +
        'html.ffd-global #root, html.ffd-global [data-slot="main"], html.ffd-global [data-slot="sidebar"],' +
        'html.ffd-global [class*="centerCol"], html.ffd-global [class*="sidebarCol"],' +
        'html.ffd-global header, html.ffd-global [role="dialog"] {' +
        ' background-color: rgba(' + tint + ',' + alpha + ') !important;' +
        ' -webkit-backdrop-filter: blur(' + blur + 'px) saturate(' + s.saturate + '%);' +
        ' backdrop-filter: blur(' + blur + 'px) saturate(' + s.saturate + '%);' +
        ' border-radius: ' + s.radius + 'px; }' +
        'html.ffd-global [role="dialog"] { background-color: rgba(' + tint + ',' + Math.min(1, alpha + .12) + ') !important; }' +
        (s.enabled && s.scope.global ? (s.customCss || '') : '');
    }
    function ensureLayers() {
      [box.querySelector('.ffd-panel'), box.querySelector('.ffd-effort-pop'), floating, card].forEach(function (target) {
        if (!target) return;
        if (!target.querySelector(':scope > .ffd-bg-layer')) {
          var layer = el('div', 'ffd-bg-layer');
          layer.setAttribute('aria-hidden', 'true');
          target.insertBefore(layer, target.firstChild);
        }
      });
    }
    function apply() {
      ensureLayers();
      applyGlobal();
      applyMedia();
      applyPluginSurfaces();
      applyHostCss();
      try {
        document.dispatchEvent(new CustomEvent('ffd:appearance-change', {
          detail: {
            customBackground: s.enabled && s.mode !== 'theme' && s.scope.panel,
            settings: clone(s)
          }
        }));
      } catch (_) {}
    }
    function commit() { save(s); syncAll(); apply(); }

    /* ---------- UI sync + event wiring (both card and floating panel) ---------- */
    function syncRoot(root) {
      root.querySelectorAll('[data-f]').forEach(function (node) {
        var k = node.getAttribute('data-f');
        if (CHECKS.indexOf(k) >= 0) node.checked = !!s[k];
        else if (node.type === 'color') node.value = s[k];
        else if (node.type === 'range') node.value = s[k];
      });
      root.querySelectorAll('[data-out]').forEach(function (o) {
        var k = o.getAttribute('data-out');
        o.textContent = s[k] + (RANGES[k] ? RANGES[k][1] : '');
      });
      root.querySelectorAll('[data-scope]').forEach(function (c) { c.checked = !!s.scope[c.getAttribute('data-scope')]; });
      root.querySelectorAll('[data-mode]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-mode') === s.mode); });
      root.querySelectorAll('[data-preset]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-preset') === s.preset && s.mode === 'gradient'); });
      root.querySelector('.ffd-block-solid').hidden = s.mode !== 'solid';
      root.querySelector('.ffd-block-gradient').hidden = s.mode !== 'gradient';
      root.querySelector('.ffd-block-media').hidden = !(s.mode === 'image' || s.mode === 'video');
      root.querySelector('.ffd-block-video').hidden = s.mode !== 'video';
      root.querySelector('.ffd-url').value = s.remoteUrl || '';
      root.querySelector('.ffd-fit').value = s.fit;
      root.querySelector('.ffd-position').value = s.position;
      root.querySelector('.ffd-custom-css').value = s.customCss || '';
      root.querySelector('.ffd-media-status').textContent = s.hasMedia
        ? '已保存本地媒体：' + (s.mediaName || s.mediaKind) + '（' + s.mediaKind + '）'
        : (s.remoteUrl ? '使用远程 URL' : '未选择媒体。文件存在浏览器 IndexedDB 中，不会上传；视频建议 < 50 MB。');
      var toggle = root.querySelector('.ffd-video-toggle');
      if (toggle) toggle.textContent = videoEl.paused ? '播放' : '暂停';
    }
    function syncAll() { surfaces.forEach(syncRoot); }

    function wire(root) {
      root.querySelectorAll('[data-mode]').forEach(function (b) {
        b.addEventListener('click', function () { s.mode = b.getAttribute('data-mode'); commit(); });
      });
      root.querySelectorAll('[data-preset]').forEach(function (b) {
        b.addEventListener('click', function () {
          var p = PRESETS.filter(function (x) { return x.id === b.getAttribute('data-preset'); })[0];
          if (!p) return;
          s.preset = p.id; s.from = p.from; s.to = p.to; s.angle = p.angle;
          s.mode = 'gradient'; commit();
        });
      });
      root.querySelectorAll('[data-f]').forEach(function (node) {
        var k = node.getAttribute('data-f');
        var handler = function () {
          if (CHECKS.indexOf(k) >= 0) s[k] = node.checked;
          else if (node.type === 'range') s[k] = clamp(node.value, Number(node.min), Number(node.max));
          else s[k] = node.value;
          if (k === 'from' || k === 'to') s.preset = 'custom';
          commit();
        };
        node.addEventListener(node.type === 'range' || node.type === 'color' ? 'input' : 'change', handler);
      });
      root.querySelectorAll('[data-scope]').forEach(function (c) {
        c.addEventListener('change', function () { s.scope[c.getAttribute('data-scope')] = c.checked; commit(); });
      });
      root.querySelector('.ffd-url').addEventListener('change', function (e) { s.remoteUrl = e.target.value.trim(); commit(); });
      root.querySelector('.ffd-fit').addEventListener('change', function (e) { s.fit = e.target.value; commit(); });
      root.querySelector('.ffd-position').addEventListener('change', function (e) { s.position = e.target.value; commit(); });
      root.querySelector('.ffd-custom-css').addEventListener('input', function (e) { s.customCss = e.target.value; commit(); });

      root.querySelector('.ffd-file').addEventListener('change', function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        var kind = /^video\//.test(file.type) || /\.(mp4|webm|mov|m4v)$/i.test(file.name) ? 'video' : 'image';
        if (kind === 'image') {
          var reader = new FileReader();
          reader.onload = function () {
            var img = new Image();
            img.onload = function () {
              var scale = Math.min(1, 1920 / Math.max(img.width, img.height));
              var c = document.createElement('canvas');
              c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
              c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
              c.toBlob(function (blob) { storeBlob(blob || file, file.name, 'image'); }, 'image/webp', .85);
            };
            img.onerror = function () { storeBlob(file, file.name, 'image'); };
            img.src = reader.result;
          };
          reader.readAsDataURL(file);
        } else {
          storeBlob(file, file.name, 'video');
        }
      });
      root.querySelector('.ffd-media-clear').addEventListener('click', function () {
        s.hasMedia = false; s.mediaKind = ''; s.mediaName = ''; s.remoteUrl = '';
        if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = ''; }
        idbDel(); commit();
      });
      var toggle = root.querySelector('.ffd-video-toggle');
      if (toggle) toggle.addEventListener('click', function () {
        if (videoEl.paused) { var p = videoEl.play(); if (p && p.catch) p.catch(function () {}); }
        else videoEl.pause();
        syncAll();
      });
      root.querySelector('.ffd-appe-reset').addEventListener('click', function () {
        s = clone(DEFAULTS);
        if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = ''; }
        idbDel(); commit();
      });
      root.querySelector('.ffd-appe-export').addEventListener('click', function () {
        var text = JSON.stringify(s, null, 2);
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(function () { window.prompt('复制配置', text); });
        else window.prompt('复制配置', text);
        var b = root.querySelector('.ffd-appe-export');
        b.textContent = '已复制 ✓'; setTimeout(function () { b.textContent = '导出配置'; }, 1400);
      });
      root.querySelector('.ffd-appe-import').addEventListener('click', function () {
        var text = window.prompt('粘贴外观配置 JSON');
        if (!text) return;
        try { var obj = JSON.parse(text); s = Object.assign(clone(DEFAULTS), obj); commit(); } catch (_) { window.alert('配置格式不正确'); }
      });
      root.querySelector('.ffd-appe-done').addEventListener('click', close);
      root.querySelector('.ffd-appe-close').addEventListener('click', function () {
        if (root === card) card.classList.toggle('ffd-collapsed');
        else close();
      });
    }
    surfaces.forEach(wire);

    function storeBlob(blob, name, kind) {
      idbPut(blob).then(function () {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        objectUrl = URL.createObjectURL(blob);
        s.hasMedia = true; s.mediaKind = kind; s.mediaName = name;
        s.remoteUrl = ''; s.mode = kind;
        commit();
      }).catch(function () {
        // Fallback: session-only object URL (no IndexedDB available).
        objectUrl = URL.createObjectURL(blob);
        s.hasMedia = false; s.mediaKind = kind; s.mediaName = name + '（仅本次会话）';
        s.remoteUrl = ''; s.mode = kind;
        commit();
      });
    }

    /* ---------- inject into the host's Appearance settings page ---------- */
    var SETTINGS_SELECTORS = [
      "[role='dialog'][aria-modal='true'][data-shortcut-modal='settings']",
      "[data-slot='sidebar.settings'] [role='dialog'][aria-modal='true']",
      "[role='dialog'][aria-modal='true']",
      "[data-slot='sidebar.settings']",
      "[data-cordis-panel]"
    ];
    function findSettingsHost() {
      for (var i = 0; i < SETTINGS_SELECTORS.length; i++) {
        var list = document.querySelectorAll(SETTINGS_SELECTORS[i]);
        for (var j = 0; j < list.length; j++) {
          if (list[j].offsetParent !== null && list[j].getBoundingClientRect().height > 80) return list[j];
        }
      }
      return null;
    }
    function pickInsertTarget(hostNode) {
      var panels = hostNode.querySelectorAll('[role="tabpanel"]');
      for (var i = 0; i < panels.length; i++) {
        if (panels[i].offsetParent !== null && panels[i].getBoundingClientRect().height > 60) return panels[i];
      }
      var sels = ["[class*='settingsContent']", "[class*='content']", "[class*='scroll']", "[class*='body']"];
      for (var k = 0; k < sels.length; k++) {
        var list = hostNode.querySelectorAll(sels[k]);
        for (var m = 0; m < list.length; m++) {
          if (list[m].offsetParent !== null && list[m].getBoundingClientRect().height > 120) return list[m];
        }
      }
      return hostNode;
    }
    function injectCard() {
      if (!autoInject) return;
      var hostNode = findSettingsHost();
      if (!hostNode) { if (cardHost.isConnected) cardHost.remove(); return; }
      var target = pickInsertTarget(hostNode);
      if (cardHost.parentElement === target) return;
      target.appendChild(cardHost);
      syncRoot(card);
    }
    var scanTimer = 0;
    var observer = new MutationObserver(function () {
      clearTimeout(scanTimer);
      scanTimer = setTimeout(injectCard, 180);
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'style', 'class', 'aria-hidden'] });

    /* ---------- floating fallback ---------- */
    function place() {
      var w = 356;
      var h = Math.min(floating.offsetHeight || 560, window.innerHeight - 24);
      floating.style.left = Math.max(12, window.innerWidth - w - 24) + 'px';
      floating.style.top = Math.max(12, window.innerHeight - h - 96) + 'px';
    }
    function open() { floating.hidden = false; syncRoot(floating); place(); }
    function close() { floating.hidden = true; }
    function toggle() { floating.hidden ? open() : close(); }
    function onOutside(e) {
      if (floating.hidden) return;
      if (floating.contains(e.target)) return;
      if (card.contains(e.target)) return;
      close();
    }
    document.addEventListener('pointerdown', onOutside, true);
    function onEsc(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onEsc);
    window.addEventListener('resize', function () { if (!floating.hidden) place(); });

    globalThis.FFD_APPEARANCE = globalThis.FFD_APPEARANCE || {};
    globalThis.FFD_APPEARANCE.open = open;
    globalThis.FFD_APPEARANCE.close = close;
    globalThis.FFD_APPEARANCE.toggle = toggle;
    globalThis.FFD_APPEARANCE.get = load;
    globalThis.FFD_APPEARANCE.defaults = function () { return clone(DEFAULTS); };
    globalThis.FFD_APPEARANCE.mount = mount;

    // slots mode: the host renders our React component and gives us a container.
    // Turn off the DOM-sniffing injector so the card is owned by React instead.
    globalThis.FFD_APPEARANCE.setAutoInject = function (on) {
      autoInject = !!on;
      clearTimeout(scanTimer);
      if (autoInject) {
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'style', 'class', 'aria-hidden'] });
        injectCard();
      } else {
        observer.disconnect();
        if (cardHost.isConnected && cardHost.parentElement &&
            !cardHost.parentElement.classList.contains('ffd-slot-host')) cardHost.remove();
      }
    };
    globalThis.FFD_APPEARANCE.mountCard = function (container) {
      if (!container) return function () {};
      autoInject = false;
      observer.disconnect();
      container.appendChild(cardHost);
      syncRoot(card);
      apply();
      return function () {
        if (cardHost.parentElement === container) container.removeChild(cardHost);
      };
    };

    // Restore an uploaded blob after reload.
    if (s.hasMedia) {
      idbGet().then(function (blob) {
        if (blob) {
          objectUrl = URL.createObjectURL(blob);
          syncAll(); apply();
        } else {
          s.hasMedia = false; save(s); syncAll(); apply();
        }
      });
    }
    videoEl.addEventListener('play', syncAll);
    videoEl.addEventListener('pause', syncAll);
    syncAll();
    apply();
    setTimeout(injectCard, 60);

    return function dispose() {
      clearTimeout(scanTimer);
      observer.disconnect();
      document.removeEventListener('pointerdown', onOutside, true);
      document.removeEventListener('keydown', onEsc);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      videoEl.pause(); videoEl.src = '';
      bg.remove(); uiStyle.remove(); cardHost.remove(); floating.remove();
      document.documentElement.classList.remove('ffd-global');
      if (ownsBox) box.remove();
    };
  }

  globalThis.FFD_APPEARANCE = {
    mount: mount,
    get: load,
    defaults: function () { return clone(DEFAULTS); }
  };
})();
