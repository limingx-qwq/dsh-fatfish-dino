/* Fatfish Dino — GPT / Codex style "reasoning effort" slider.
   Visual reference: bilibili BV1C5YZ69EdX, frames 0.0s - 8.0s (0.5s interval).
   The original "强度" popover has a white pill track, a blue->violet gradient fill with a
   swallow-tail right edge, a white circular thumb, a star glyph, a level name + model
   subtitle, and a reset button. Dragging shows a purple quip instead of the level name. */
(function () {
  'use strict';

  var EFFORT_KEY = 'ffd.effort';
  var MODEL_KEY = 'ffd.effort.model';

  var LEVELS = [
    { key: 'minimal', label: '轻度', value: 0, tip: '几乎不思考，省下额度', model: 'DeepSeek · 快速回答' },
    { key: 'low', label: '标准', value: 25, tip: '够用就好，别太较真', model: 'DeepSeek · 均衡' },
    { key: 'medium', label: '深度', value: 50, tip: '让它多想一会儿', model: 'DeepSeek · 深度思考' },
    { key: 'high', label: '极致', value: 75, tip: '更快消耗使用额度', model: 'DeepSeek · 深度思考（扩展）' },
    { key: 'ultra', label: 'Ultra', value: 100, tip: '更快消耗使用额度', model: 'GPT-6 Astra · 面见神明' }
  ];
  var MODELS = [
    { id: 'deepseek-reasoner', name: 'DeepSeek · 深度思考' },
    { id: 'deepseek-chat', name: 'DeepSeek · 快速回答' },
    { id: 'deepseek-r2', name: 'DeepSeek R2 · 推理' },
    { id: 'codex-spark', name: 'Codex Spark · 轻度' },
    { id: 'gpt-6-astra', name: 'GPT-6 Astra（视频梗）' }
  ];

  function store(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); }
    catch (_) { return null; }
    return v;
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function levelForValue(v) {
    var best = LEVELS[0], d = 999;
    for (var i = 0; i < LEVELS.length; i++) {
      var dd = Math.abs(LEVELS[i].value - v);
      if (dd < d) { d = dd; best = LEVELS[i]; }
    }
    return best;
  }
  function levelForKey(k) {
    for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i].key === k) return LEVELS[i];
    return LEVELS[2];
  }

  function mount(rootEl) {
    var host = rootEl || document.body;
    var ownsBox = false;
    var box = null;
    if (host.classList && host.classList.contains('ffd-root')) box = host;
    else if (host.querySelector) box = host.querySelector('.ffd-root');
    if (!box) { box = el('div', 'ffd-root'); host.appendChild(box); ownsBox = true; }

    var savedValue = store(EFFORT_KEY + '.value');
    var value = savedValue == null ? 50 : clamp(parseInt(savedValue, 10) || 0, 0, 100);
    var storedLevel = store(EFFORT_KEY);
    if (savedValue == null && storedLevel) {
      // migrate from an earlier level-key-only save
      value = levelForKey(storedLevel).value;
    }
    var modelId = store(MODEL_KEY) || MODELS[0].id;
    var hot = value >= 75;

    /* ---------- popover ---------- */
    var pop = el('div', 'ffd-effort-pop');
    pop.hidden = true;
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', '思考强度');
    pop.innerHTML =
      '<div class="ffd-effort-top">' +
        '<span class="ffd-effort-spark" id="ffd-spark">✦</span>' +
        '<div class="ffd-effort-meta">' +
          '<div id="ffd-meta-title"><button class="ffd-effort-name" id="ffd-level-name" type="button">深度 <span class="ffd-chev">›</span></button>' +
          '<div class="ffd-effort-model" id="ffd-model-name">DeepSeek · 深度思考</div></div>' +
          '<div class="ffd-effort-tip" id="ffd-tip" hidden></div>' +
        '</div>' +
        '<button class="ffd-effort-reset" id="ffd-reset" type="button" title="恢复默认" aria-label="恢复默认">⟳</button>' +
        '<div class="ffd-model-menu" id="ffd-model-menu" hidden></div>' +
      '</div>' +
      '<div class="ffd-slider" id="ffd-slider" tabindex="0" role="slider" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50" aria-label="思考强度拖动条">' +
        '<div class="ffd-track"><div class="ffd-dots"><i></i><i></i><i></i><i></i><i></i></div><div class="ffd-fill" id="ffd-fill"></div></div>' +
        '<div class="ffd-thumb" id="ffd-thumb"></div>' +
      '</div>' +
      '<div class="ffd-ticks" id="ffd-ticks"></div>' +
      '<div class="ffd-effort-foot"><span>思考强度</span><span class="ffd-spacer"></span>' +
        '<button id="ffd-select-effort" type="button">Select effort ⌄</button>' +
        '<button id="ffd-done" type="button">完成</button></div>';
    box.appendChild(pop);

    var slider = pop.querySelector('#ffd-slider');
    var fill = pop.querySelector('#ffd-fill');
    var thumb = pop.querySelector('#ffd-thumb');
    var sparkEl = pop.querySelector('#ffd-spark');
    var nameEl = pop.querySelector('#ffd-level-name');
    var modelNameEl = pop.querySelector('#ffd-model-name');
    var metaTitle = pop.querySelector('#ffd-meta-title');
    var tipEl = pop.querySelector('#ffd-tip');
    var ticksEl = pop.querySelector('#ffd-ticks');
    var menu = pop.querySelector('#ffd-model-menu');
    var anchorBtn = null;

    LEVELS.forEach(function (l) {
      var s = el('span', '', l.label);
      s.setAttribute('data-value', l.value);
      ticksEl.appendChild(s);
    });

    function renderMeta(dragging) {
      var l = levelForValue(value);
      nameEl.innerHTML = l.label + ' <span class="ffd-chev">›</span>';
      modelNameEl.textContent = currentModel().name;
      tipEl.textContent = l.tip;
      metaTitle.hidden = !!dragging;
      tipEl.hidden = !dragging;
      sparkEl.classList.toggle('is-hot', value >= 75);
      sparkEl.textContent = value >= 75 ? '✦' : '✧';
      Array.prototype.forEach.call(ticksEl.children, function (s) {
        s.classList.toggle('is-active', Number(s.getAttribute('data-value')) === l.value);
      });
    }
    function currentModel() {
      for (var i = 0; i < MODELS.length; i++) if (MODELS[i].id === modelId) return MODELS[i];
      return MODELS[0];
    }
    function render() {
      var l = levelForValue(value);
      var pct = value + '%';
      pop.style.setProperty('--ffd-pct', pct);
      fill.style.width = pct;
      thumb.style.left = 'calc(' + pct + ' - 13px)';
      slider.setAttribute('aria-valuenow', String(value));
      slider.setAttribute('aria-valuetext', l.label);
      hot = value >= 75;
      renderMeta(slider.classList.contains('is-dragging'));
      if (anchorBtn) anchorBtn.innerHTML = '<span class="ffd-spark">' + (hot ? '✦' : '✧') + '</span>思考强度 · <span class="ffd-lvl">' + l.label + '</span><span class="ffd-caret">▾</span>';
    }
    function commit(v, snap) {
      value = clamp(Math.round(v), 0, 100);
      if (snap) value = levelForValue(value).value;
      var l = levelForValue(value);
      store(EFFORT_KEY, l.key);
      store(EFFORT_KEY + '.value', String(value));
      try {
        document.dispatchEvent(new CustomEvent('ffd:effort-change', {
          detail: { level: l.key, label: l.label, value: value, model: modelId }
        }));
        window.dispatchEvent(new CustomEvent('ffd:effort-change', {
          detail: { level: l.key, label: l.label, value: value, model: modelId }
        }));
      } catch (_) {}
      syncNative(l);
      render();
    }

    /* ---------- slider interaction ---------- */
    var dragging = false, tipTimer = 0;
    function fromEvent(e) {
      var r = slider.getBoundingClientRect();
      return ((e.clientX - r.left) / r.width) * 100;
    }
    function beginDrag(e) {
      dragging = true;
      slider.classList.add('is-dragging');
      slider.setPointerCapture(e.pointerId);
      clearTimeout(tipTimer);
      commit(fromEvent(e), false);
      e.preventDefault();
    }
    slider.addEventListener('pointerdown', beginDrag);
    slider.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      commit(fromEvent(e), false);
    });
    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      slider.classList.remove('is-dragging');
      try { slider.releasePointerCapture(e.pointerId); } catch (_) {}
      commit(levelForValue(value).value, false);
      tipTimer = setTimeout(function () { renderMeta(false); }, 850);
    }
    slider.addEventListener('pointerup', endDrag);
    slider.addEventListener('pointercancel', endDrag);
    slider.addEventListener('keydown', function (e) {
      var v = value;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') v += 5;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') v -= 5;
      else if (e.key === 'Home') v = 0;
      else if (e.key === 'End') v = 100;
      else return;
      e.preventDefault();
      clearTimeout(tipTimer);
      commit(v, false);
      tipTimer = setTimeout(function () { renderMeta(false); }, 850);
    });

    pop.querySelector('#ffd-reset').addEventListener('click', function () { commit(50, false); });
    pop.querySelector('#ffd-done').addEventListener('click', function () { close(); });
    pop.querySelector('#ffd-select-effort').addEventListener('click', function () { toggleMenu(); });
    nameEl.addEventListener('click', function (e) { e.stopPropagation(); toggleMenu(); });

    function buildMenu() {
      menu.innerHTML = '';
      MODELS.forEach(function (m) {
        var b = el('button', '', '<span>' + m.name + '</span>' + (m.id === modelId ? '<span class="ffd-check">✓</span>' : ''));
        b.type = 'button';
        b.addEventListener('click', function () {
          modelId = m.id;
          store(MODEL_KEY, m.id);
          menu.hidden = true;
          commit(value, false);
        });
        menu.appendChild(b);
      });
    }
    function toggleMenu() { buildMenu(); menu.hidden = !menu.hidden; }

    function place() {
      if (!anchorBtn) return;
      var r = anchorBtn.getBoundingClientRect();
      var w = pop.offsetWidth || 322;
      var h = pop.offsetHeight || 196;
      var left = clamp(r.left, 12, Math.max(12, window.innerWidth - w - 12));
      var top = r.top - h - 12;
      if (top < 12) top = Math.min(window.innerHeight - h - 12, r.bottom + 12);
      pop.style.left = left + 'px';
      pop.style.top = Math.max(12, top) + 'px';
    }
    function open() {
      if (!anchorBtn) ensureAnchor(true);
      if (!anchorBtn) return;
      pop.hidden = false;
      place();
      render();
    }
    function close() { pop.hidden = true; menu.hidden = true; }
    function toggle() { pop.hidden ? open() : close(); }

    /* ---------- replace the native "thinking depth" control ---------- */
    var native = null, nativeParent = null, originalPosition = '';
    var TRY_RE = /思考深度|思考强度|思维深度|推理强度|思考力度|reasoning\s*effort|thinking\s*depth|effort|深度思考/i;

    function looksLikeControl(n) {
      if (!n || n.nodeType !== 1 || n.closest('.ffd-root')) return false;
      var tag = n.tagName;
      if (tag !== 'BUTTON' && tag !== 'SELECT' && n.getAttribute('role') !== 'combobox' && n.getAttribute('role') !== 'button') return false;
      var text = (n.innerText || n.getAttribute('aria-label') || n.value || '').trim();
      if (!text || text.length > 40 || !TRY_RE.test(text)) return false;
      var r = n.getBoundingClientRect();
      if (r.width < 24 || r.width > 420 || r.height < 14 || r.height > 80) return false;
      if (n.querySelector('input, textarea, [contenteditable="true"]')) return false;
      return true;
    }
    function findNative() {
      var cands = document.querySelectorAll('button, select, [role="combobox"], [role="button"]');
      var bestScore = 1e9, best = null;
      for (var i = 0; i < cands.length; i++) {
        var n = cands[i];
        if (!looksLikeControl(n)) continue;
        var text = (n.innerText || '').trim();
        var score = text.length + (n.closest('[data-slot]') ? -5 : 0);
        if (score < bestScore) { bestScore = score; best = n; }
      }
      return best;
    }
    function syncNative(l) {
      // When the native control is a plain <select>, keep its value in sync without clicking.
      if (!native || native.tagName !== 'SELECT') return;
      var wanted = l.label;
      for (var i = 0; i < native.options.length; i++) {
        if (native.options[i].text.indexOf(wanted) >= 0) {
          if (native.selectedIndex !== i) {
            native.selectedIndex = i;
            native.dispatchEvent(new Event('change', { bubbles: true }));
          }
          break;
        }
      }
    }
    function positionAnchor() {
      if (!anchorBtn || !native || !native.isConnected) return;
      var nr = native.getBoundingClientRect();
      var pr = nativeParent.getBoundingClientRect();
      anchorBtn.style.left = (nr.left - pr.left) + 'px';
      anchorBtn.style.top = (nr.top - pr.top) + 'px';
      anchorBtn.style.width = Math.max(112, nr.width) + 'px';
      anchorBtn.style.height = Math.max(28, Math.min(36, nr.height)) + 'px';
    }
    function ensureAnchor(force) {
      if (anchorBtn && anchorBtn.isConnected && native && native.isConnected) { positionAnchor(); return; }
      var found = findNative();
      if (!found) return;
      // A fallback pill was mounted earlier; retire it before taking over the real control.
      if (anchorBtn && anchorBtn.getAttribute('data-ffd-fallback')) {
        anchorBtn.remove();
        anchorBtn = null;
      }
      native = found;
      nativeParent = native.parentElement;
      if (!nativeParent) return;
      originalPosition = nativeParent.style.position;
      nativeParent.classList.add('ffd-effort-anchor-host');
      if (!originalPosition || originalPosition === 'static') nativeParent.style.position = 'relative';
      native.classList.add('ffd-native-muted');
      native.setAttribute('aria-hidden', 'true');

      anchorBtn = el('button', 'ffd-effort-btn');
      anchorBtn.type = 'button';
      anchorBtn.setAttribute('aria-label', '选择思考强度');
      anchorBtn.addEventListener('click', function (e) { e.stopPropagation(); toggle(); });
      nativeParent.appendChild(anchorBtn);
      positionAnchor();
      render();
      if (force) place();
    }

    // Fallback: a standalone pill when DSH exposes no native control (or a very different build).
    function ensureFallback() {
      if (anchorBtn && anchorBtn.isConnected) return;
      if (!anchorBtn) {
        anchorBtn = el('button', 'ffd-effort-btn');
        anchorBtn.type = 'button';
        anchorBtn.setAttribute('data-ffd-fallback', '1');
        anchorBtn.style.position = 'fixed';
        anchorBtn.style.left = 'auto';
        anchorBtn.style.top = 'auto';
        anchorBtn.style.right = '96px';
        anchorBtn.style.bottom = '32px';
        anchorBtn.style.width = 'auto';
        anchorBtn.style.height = '38px';
        anchorBtn.style.zIndex = '2147483002';
        anchorBtn.addEventListener('click', function (e) { e.stopPropagation(); toggle(); });
        box.appendChild(anchorBtn);
        render();
      }
    }

    var scanTimer = 0, mountedAt = Date.now();
    function scan() {
      ensureAnchor(false);
      // Only fall back after the host UI had time to render its own control.
      if (!anchorBtn && Date.now() - mountedAt > 1600) ensureFallback();
    }
    var observer = new MutationObserver(function () {
      clearTimeout(scanTimer);
      scanTimer = setTimeout(scan, 220);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    scan();
    setTimeout(scan, 1700);

    function onOutside(e) {
      if (pop.hidden) return;
      if (pop.contains(e.target) || (anchorBtn && anchorBtn.contains(e.target))) return;
      close();
    }
    document.addEventListener('pointerdown', onOutside, true);
    function onEsc(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onEsc);
    window.addEventListener('resize', function () { positionAnchor(); if (!pop.hidden) place(); });
    window.addEventListener('scroll', function () { if (!pop.hidden) place(); }, true);

    render();
    return function dispose() {
      clearTimeout(scanTimer); clearTimeout(tipTimer);
      observer.disconnect();
      document.removeEventListener('pointerdown', onOutside, true);
      document.removeEventListener('keydown', onEsc);
      if (native) native.classList.remove('ffd-native-muted');
      if (nativeParent) {
        nativeParent.classList.remove('ffd-effort-anchor-host');
        if (!originalPosition || originalPosition === 'static') nativeParent.style.position = originalPosition;
      }
      if (anchorBtn) anchorBtn.remove();
      pop.remove();
      if (ownsBox) box.remove();
    };
  }

  globalThis.FFD_EFFORT = {
    mount: mount,
    levels: LEVELS,
    models: MODELS,
    get: function () {
      var v = 50;
      try { v = clamp(parseInt(localStorage.getItem(EFFORT_KEY + '.value'), 10) || 0, 0, 100); } catch (_) {}
      return levelForValue(v);
    }
  };
})();
