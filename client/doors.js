/* Fatfish Door Dash — a "choose-the-right-door" endless runner using the AI-generated
   "Blue Fatfish / DeepSeek whale girl" art.

   Plain script: works both as a DSH client module side-effect import and as a <script> in the demo.

   Gameplay: the Fatfish auto-runs forward through a corridor. Every few seconds a PAIR of
   doors slides towards you — each door carries a different symbol. The HUD shows the target
   symbol; steer left (←) or right (→) into the door that MATCHES it. Match = the door opens
   and you score; mismatch = you slam into it and the run ends. The target changes after every
   successful door, and the corridor speeds up. */
(function () {
  'use strict';

  var BEST_KEY = 'ffd.doors.best';
  var MUTE_KEY = 'ffd.doors.mute';
  var BALL_KEY = 'ffd.ball.pos';

  function store(key, value) {
    try { if (value === undefined) return localStorage.getItem(key); localStorage.setItem(key, value); }
    catch (_) { return null; }
    return value;
  }
  function num(value, fallback) { var n = parseInt(value, 10); return isNaN(n) ? fallback : n; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function pad5(n) { return ('00000' + Math.max(0, Math.floor(n))).slice(-5); }

  var THEMES = {
    light: { sky: '#eef3ff', ink: '#1b2340', line: '#cdd6ec', road: '#d7deef', roadEdge: '#aab5d2', shell: '#ffffff', shellEdge: '#c2cbe4' },
    dark: { sky: '#111827', ink: '#eef2ff', line: '#3a4562', road: '#2b3551', roadEdge: '#4a5680', shell: '#1b2132', shellEdge: '#39445f' }
  };

  /* door symbols — colour + glyph, so it stays readable without relying on colour alone */
  var SYMBOLS = [
    { id: 'up', glyph: '▲', color: '#36d399' },
    { id: 'cross', glyph: '✕', color: '#ff5874' },
    { id: 'star', glyph: '★', color: '#5aa9ff' },
    { id: 'dot', glyph: '●', color: '#ffb545' }
  ];

  function createAudio() {
    var ac = null;
    function tone(freq, dur, type, gain) {
      if (store(MUTE_KEY) === '1') return;
      try {
        if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
        if (ac.state === 'suspended') ac.resume();
        var o = ac.createOscillator(), g = ac.createGain();
        o.type = type || 'square'; o.frequency.value = freq;
        g.gain.setValueAtTime(gain || 0.045, ac.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
        o.connect(g); g.connect(ac.destination);
        o.start(); o.stop(ac.currentTime + dur);
      } catch (_) { /* audio is optional */ }
    }
    return {
      turn: function () { tone(620, 0.06, 'square', 0.028); },
      pass: function () { tone(760, 0.10, 'sine', 0.05); setTimeout(function () { tone(1140, 0.13, 'sine', 0.042); }, 80); },
      hit: function () { tone(140, 0.32, 'sawtooth', 0.06); }
    };
  }

  function loadImage(src) {
    var img = new Image();
    img.decoding = 'async';
    img.src = src;
    return img;
  }

  function mount(rootEl) {
    var host = rootEl || document.body;
    var ART = globalThis.FFD_ART || {};
    var audio = createAudio();
    var imgs = {
      hero: loadImage(ART.hero || ''),
      gameover: loadImage(ART.gameover || ''),
      ball: loadImage(ART.ball || '')
    };

    /* ---------- DOM (same contract as the previous runner: .ffd-ball / .ffd-panel / #ffd-canvas / #ffd-play) ---------- */
    var ownsBox = false;
    var box = null;
    if (host && host.classList && host.classList.contains('ffd-root')) box = host;
    else if (host && host.querySelector) box = host.querySelector('.ffd-root');
    if (!box) { box = el('div', 'ffd-root'); (host || document.body).appendChild(box); ownsBox = true; }

    var ballWrap = el('div', 'ffd-ball-wrap');
    var ball = el('button', 'ffd-ball');
    ball.type = 'button';
    ball.title = '大肥鱼闯门 · 点击开始';
    ball.setAttribute('aria-label', '打开大肥鱼闯门小游戏');
    ball.innerHTML = '<img alt="" src="' + (ART.ball || ART.hero || '') + '"><span class="ffd-ball-best">HI ' + pad5(num(store(BEST_KEY), 0)) + '</span>';
    ballWrap.appendChild(ball);
    box.appendChild(ballWrap);

    var panel = el('section', 'ffd-panel');
    panel.hidden = true;
    panel.setAttribute('aria-label', '大肥鱼闯门');
    panel.innerHTML =
      '<header class="ffd-head">' +
        '<img class="ffd-logo" alt="" src="' + (ART.ball || '') + '">' +
        '<div class="ffd-title">大肥鱼闯门 <small>Fatfish Door Dash · 选对门才能过</small></div>' +
        '<div class="ffd-scores"><span>得分 <b id="ffd-score">00000</b></span><span>HI <b class="ffd-hi" id="ffd-best">' + pad5(num(store(BEST_KEY), 0)) + '</b></span></div>' +
        '<button class="ffd-icon-btn" id="ffd-mute" type="button" title="音效开关" aria-label="音效开关">' + (store(MUTE_KEY) === '1' ? '🔇' : '🔊') + '</button>' +
        '<button class="ffd-icon-btn" id="ffd-close" type="button" title="收起" aria-label="收起游戏">✕</button>' +
      '</header>' +
      '<div class="ffd-stage">' +
        '<canvas id="ffd-canvas" tabindex="0" aria-label="闯门游戏画面，用左右方向键选择与目标符号一致的门"></canvas>' +
        '<div class="ffd-overlay" id="ffd-overlay">' +
          '<img id="ffd-overlay-img" alt="" src="' + (ART.hero || '') + '">' +
          '<h3 id="ffd-overlay-title">大肥鱼，冲！</h3>' +
          '<p id="ffd-overlay-desc">每对门里只有一扇和左上角<b>目标符号</b>一致<br><kbd>←</kbd> <kbd>→</kbd> 选跑道　<kbd>空格</kbd> 开始　<kbd>Esc</kbd> 退出</p>' +
          '<p class="ffd-newbest" id="ffd-overlay-new" hidden></p>' +
          '<button class="ffd-play" id="ffd-play" type="button">开始游戏</button>' +
        '</div>' +
      '</div>' +
      '<footer class="ffd-foot"><span>蓝色大肥鱼 · 鲸鱼娘 DeepSeek 同人表情包梗</span><span class="ffd-spacer"></span><span class="ffd-badge" id="ffd-level">闯门模式</span><span>最高分自动保存在本机</span></footer>';
    box.appendChild(panel);

    var canvas = panel.querySelector('#ffd-canvas');
    var ctx = canvas.getContext('2d');
    var overlay = panel.querySelector('#ffd-overlay');
    var overlayImg = panel.querySelector('#ffd-overlay-img');
    var overlayTitle = panel.querySelector('#ffd-overlay-title');
    var overlayDesc = panel.querySelector('#ffd-overlay-desc');
    var overlayNew = panel.querySelector('#ffd-overlay-new');
    var playBtn = panel.querySelector('#ffd-play');
    var scoreEl = panel.querySelector('#ffd-score');
    var bestEl = panel.querySelector('#ffd-best');
    var muteBtn = panel.querySelector('#ffd-mute');

    /* ---------- state ---------- */
    var cw = 880, ch = 240, dpr = 1;
    var MAX = 1000;        // far depth (world units)
    var GAP = 380;         // depth gap between consecutive door pairs
    var state = 'idle';    // idle | running | over
    var score = 0, best = num(store(BEST_KEY), 0);
    var speed = 5.5, last = 0, raf = 0, flash = 0, flashColor = '255,255,255';
    var customBackground = false;
    var theme = THEMES.light;
    var gates = [];
    var lane = 1, laneX = 0, laneTarget = 0;   // lane: 0 left, 1 right
    var target = SYMBOLS[0];

    function geom() {
      var centerX = cw / 2;
      var laneOff = cw * 0.21;
      var hY = ch * 0.38;        // horizon
      var gY = ch - 14;          // near ground line
      return { centerX: centerX, laneOff: laneOff, hY: hY, gY: gY, nearDoorW: laneOff * 0.84, nearDoorH: ch * 0.48 };
    }
    function detectTheme() {
      var h = document.documentElement;
      var dark = h.getAttribute('data-ds-dark-theme') === 'true' ||
        h.getAttribute('data-theme') === 'dark' ||
        h.classList.contains('dark') ||
        (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
      theme = dark ? THEMES.dark : THEMES.light;
      box.setAttribute('data-ffd-theme', dark ? 'dark' : 'light');
    }
    function resize() {
      var rect = canvas.getBoundingClientRect();
      cw = Math.max(320, Math.round(rect.width || 880));
      ch = Math.max(160, Math.round(rect.height || 240));
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var g = geom();
      laneX = laneTarget = (lane === 0 ? g.centerX - g.laneOff : g.centerX + g.laneOff);
      if (state !== 'running') render(0);
    }

    /* ---------- projection ---------- */
    function projY(t) { var g = geom(); return g.gY - (g.gY - g.hY) * t; }
    function laneScreenX(l, t) { var g = geom(); return g.centerX + (l === 0 ? -1 : 1) * g.laneOff * (1 - t); }
    function scaleAt(t) { return lerp(1.0, 0.12, t); }

    /* ---------- drawing ---------- */
    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
    function drawRoad() {
      var g = geom();
      if (!customBackground) {
        ctx.fillStyle = theme.sky;
        ctx.fillRect(0, g.hY, cw, ch - g.hY);
      }
      // corridor floor
      ctx.fillStyle = theme.road;
      ctx.beginPath();
      ctx.moveTo(g.centerX - g.laneOff, g.gY);
      ctx.lineTo(g.centerX + g.laneOff, g.gY);
      ctx.lineTo(g.centerX + g.laneOff * 0.14, g.hY);
      ctx.lineTo(g.centerX - g.laneOff * 0.14, g.hY);
      ctx.closePath();
      ctx.fill();
      // lane edges
      ctx.strokeStyle = theme.roadEdge; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(g.centerX - g.laneOff, g.gY); ctx.lineTo(g.centerX - g.laneOff * 0.14, g.hY);
      ctx.moveTo(g.centerX + g.laneOff, g.gY); ctx.lineTo(g.centerX + g.laneOff * 0.14, g.hY);
      ctx.stroke();
      // speed rungs
      ctx.strokeStyle = theme.line; ctx.lineWidth = 1.5;
      for (var d = 70; d < MAX; d += 95) {
        var t = d / MAX;
        var y = projY(t);
        ctx.globalAlpha = clamp(0.45 - t * 0.4, 0.06, 0.45);
        ctx.beginPath();
        ctx.moveTo(laneScreenX(0, t), y); ctx.lineTo(laneScreenX(1, t), y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    function drawDoor(gate) {
      var t = clamp(gate.z / MAX, 0, 1);
      var s = scaleAt(t);
      var g = geom();
      var w = g.nearDoorW * s;
      var h = g.nearDoorH * s;
      var bottom = projY(t);
      var top = bottom - h;
      for (var ln = 0; ln < 2; ln++) {
        var sym = ln === 0 ? gate.left : gate.right;
        var dx = laneScreenX(ln, t);
        var isMatch = sym.id === gate.sym.id;
        ctx.save();
        var grad = ctx.createLinearGradient(0, top, 0, bottom);
        grad.addColorStop(0, hexA(sym.color, 0.30));
        grad.addColorStop(1, hexA(sym.color, 0.10));
        ctx.fillStyle = grad;
        var r = Math.max(2, 8 * s);
        roundRect(dx - w / 2, top, w, h, r);
        ctx.fill();
        ctx.lineWidth = Math.max(1.5, 3 * s);
        ctx.strokeStyle = sym.color;
        ctx.stroke();
        // symbol on the door
        ctx.fillStyle = sym.color;
        ctx.font = '700 ' + Math.max(9, 24 * s) + 'px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(sym.glyph, dx, top + h * 0.42);
        // the matching door gets a highlight ring
        if (isMatch) {
          ctx.strokeStyle = hexA(sym.color, 0.9);
          ctx.lineWidth = Math.max(1, 2 * s);
          ctx.beginPath();
          ctx.arc(dx, top + h * 0.42, Math.max(6, 17 * s), 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
    function hexA(hex, a) {
      var h = hex.replace('#', '');
      var r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
      return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
    }
    function drawPlayer() {
      var g = geom();
      var ph = g.nearDoorH * 0.5, pw = ph * 0.84;
      var py = g.gY - ph - 3;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 4;
      if (imgs.hero.complete && imgs.hero.naturalWidth) ctx.drawImage(imgs.hero, laneX - pw / 2, py, pw, ph);
      else { ctx.fillStyle = '#4d7cff'; roundRect(laneX - pw / 2, py, pw, ph, 12); ctx.fill(); }
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = hexA('#7aa0ff', 0.55);
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(laneX, g.gY - 2, pw * 0.68, 5.5, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    function drawHud() {
      // target chip
      var r = 13;
      ctx.save();
      ctx.fillStyle = theme.shell;
      roundRect(14, 12, 104, 30, r);
      ctx.fill();
      ctx.strokeStyle = theme.shellEdge; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = target.color;
      ctx.font = '700 16px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(target.glyph, 32, 27);
      ctx.fillStyle = theme.ink;
      ctx.font = '600 11px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('目标', 46, 27);
      ctx.restore();
      // score
      ctx.fillStyle = theme.ink;
      ctx.font = '700 15px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
      ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
      ctx.fillText('HI ' + pad5(best) + '   ' + pad5(score), cw - 16, 30);
      ctx.textAlign = 'left';
    }
    function render(t) {
      ctx.clearRect(0, 0, cw, ch);
      drawRoad();
      var sorted = gates.slice().sort(function (a, b) { return b.z - a.z; });
      for (var i = 0; i < sorted.length; i++) drawDoor(sorted[i]);
      drawPlayer();
      drawHud();
      if (flash > 0) {
        ctx.fillStyle = 'rgba(' + flashColor + ',' + (flash * 0.45).toFixed(3) + ')';
        ctx.fillRect(0, 0, cw, ch);
      }
    }

    /* ---------- simulation ---------- */
    function randomSymbol(exclude) {
      var pool = SYMBOLS.filter(function (s) { return !exclude || s.id !== exclude.id; });
      return pool[Math.floor(Math.random() * pool.length)];
    }
    function reset() {
      score = 0; speed = 5.5; gates = []; flash = 0;
      target = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      lane = 1;
      var g = geom();
      laneX = laneTarget = g.centerX + g.laneOff;
      scoreEl.textContent = pad5(0);
    }
    function choose(l) {
      if (state !== 'running') start();
      lane = (l === 0) ? 0 : 1;
      var g = geom();
      laneTarget = (lane === 0 ? g.centerX - g.laneOff : g.centerX + g.laneOff);
      audio.turn();
    }
    function spawnGate() {
      // Each pair carries its own "correct" symbol: the matching door shows `sym`,
      // the other door shows a different one. The HUD target follows the NEAREST pair,
      // so the displayed target always matches the doors you are about to reach.
      var sym = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      var other = randomSymbol(sym);
      var matchLeft = Math.random() < 0.5;
      gates.push({
        z: MAX,
        sym: sym,
        left: matchLeft ? sym : other,
        right: matchLeft ? other : sym,
        resolved: false
      });
    }
    function gameOver() {
      state = 'over';
      audio.hit();
      var isBest = Math.floor(score) > best;
      if (isBest) {
        best = Math.floor(score);
        store(BEST_KEY, String(best));
        bestEl.textContent = pad5(best);
        ball.querySelector('.ffd-ball-best').textContent = 'HI ' + pad5(best);
        audio.pass();
      }
      overlayImg.src = ART.gameover || ART.hero || '';
      overlayTitle.textContent = isBest ? '新纪录！大肥鱼穿过了所有门' : '大肥鱼撞门了…';
      overlayDesc.innerHTML = '本局得分 <b>' + pad5(score) + '</b>　最高分 <b>' + pad5(best) + '</b><br>按 <kbd>空格</kbd> 或点击按钮再来一局';
      overlayNew.hidden = !isBest;
      overlayNew.textContent = isBest ? '🏆 已刷新本机最高分' : '';
      playBtn.textContent = '再来一局';
      overlay.hidden = false;
    }
    function step(t, dt) {
      score += 0.10 * dt * (speed / 5.5);
      speed = Math.min(21, 5.5 + score / 90);
      scoreEl.textContent = pad5(score);

      laneX += (laneTarget - laneX) * clamp(0.24 * dt, 0, 1);

      // keep even spacing in world depth so faster runs don't bunch the doors up
      var nearest = gates.length ? Math.min.apply(null, gates.map(function (g) { return g.z; })) : MAX;
      if (nearest > MAX - GAP) spawnGate();

      for (var i = gates.length - 1; i >= 0; i--) {
        var gate = gates[i];
        gate.z -= speed * dt;
        if (!gate.resolved && gate.z <= 0) {
          gate.resolved = true;
          var picked = lane === 0 ? gate.left : gate.right;
          if (picked.id === gate.sym.id) {
            flash = 1; flashColor = '120,230,170';
            audio.pass();
            gates.splice(i, 1);
          } else {
            gameOver();
            return;
          }
        } else if (gate.z < -140) {
          gates.splice(i, 1);
        }
      }
      // HUD target always mirrors the nearest upcoming pair of doors.
      var nearest = null;
      for (var j = 0; j < gates.length; j++) {
        if (!nearest || gates[j].z < nearest.z) nearest = gates[j];
      }
      if (nearest) target = nearest.sym;
      if (flash > 0) flash = Math.max(0, flash - 0.06 * dt);
      render(t);
    }
    function loop(t) {
      if (state !== 'running') return;
      var dt = last ? clamp((t - last) / 16.667, 0.2, 2.6) : 1;
      last = t;
      step(t, dt);
      if (state === 'running') raf = requestAnimationFrame(loop);
    }
    function start() {
      cancelAnimationFrame(raf);
      reset();
      state = 'running';
      overlay.hidden = true;
      last = 0;
      render(0);
      raf = requestAnimationFrame(loop);
      try { canvas.focus({ preventScroll: true }); } catch (_) { canvas.focus(); }
    }
    function pause() {
      if (state === 'running') { state = 'idle'; cancelAnimationFrame(raf); render(0); }
    }

    /* ---------- interactions ---------- */
    function open() {
      panel.hidden = false;
      detectTheme();
      resize();
      render(0);
      if (state === 'idle' && overlay.hidden) { state = 'running'; last = 0; raf = requestAnimationFrame(loop); }
    }
    function close() { pause(); panel.hidden = true; }
    function toggle() { panel.hidden ? open() : close(); }

    globalThis.FFD_DOORS = globalThis.FFD_DOORS || {};
    globalThis.FFD_DOORS.open = open;
    globalThis.FFD_DOORS.close = close;
    globalThis.FFD_DOORS.toggle = toggle;
    globalThis.FFD_DOORS.getBest = function () { return best; };

    // Ball: drag to reposition, click to toggle.
    var drag = null, suppressUntil = 0;
    function suppressNextClick() { suppressUntil = Date.now() + 600; }
    function applyBallPos(x, y) {
      ballWrap.style.left = x + 'px'; ballWrap.style.top = y + 'px';
      ballWrap.style.right = 'auto'; ballWrap.style.bottom = 'auto';
    }
    function syncPanelToBall() {
      var r = ballWrap.getBoundingClientRect();
      panel.style.left = 'auto';
      panel.style.right = Math.max(12, window.innerWidth - r.right) + 'px';
      panel.style.bottom = Math.max(12, window.innerHeight - r.top + 12) + 'px';
    }
    (function restoreBall() {
      var raw = store(BALL_KEY);
      if (!raw) return;
      try {
        var p = JSON.parse(raw);
        if (typeof p.x === 'number' && typeof p.y === 'number') {
          applyBallPos(clamp(p.x, 0, window.innerWidth - 58), clamp(p.y, 0, window.innerHeight - 58));
          syncPanelToBall();
        }
      } catch (_) {}
    })();
    ball.addEventListener('pointerdown', function (e) {
      var r = ballWrap.getBoundingClientRect();
      drag = { sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top, moved: false };
      try { ball.setPointerCapture(e.pointerId); } catch (_) {}
    });
    ball.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 6) return;
      drag.moved = true;
      ball.classList.add('is-dragging');
      applyBallPos(clamp(drag.ox + dx, 0, window.innerWidth - 58), clamp(drag.oy + dy, 0, window.innerHeight - 58));
    });
    ball.addEventListener('pointerup', function (e) {
      if (!drag) return;
      ball.classList.remove('is-dragging');
      if (drag.moved) {
        var r = ballWrap.getBoundingClientRect();
        store(BALL_KEY, JSON.stringify({ x: r.left, y: r.top }));
        syncPanelToBall();
        suppressNextClick();
      }
      drag = null;
      try { ball.releasePointerCapture(e.pointerId); } catch (_) {}
    });
    ball.addEventListener('pointercancel', function () { drag = null; ball.classList.remove('is-dragging'); });
    ball.addEventListener('click', function () { if (Date.now() < suppressUntil) return; toggle(); });

    panel.querySelector('#ffd-close').addEventListener('click', close);
    muteBtn.addEventListener('click', function () {
      var muted = store(MUTE_KEY) === '1';
      store(MUTE_KEY, muted ? '0' : '1');
      muteBtn.textContent = muted ? '🔊' : '🔇';
    });
    playBtn.addEventListener('click', function (e) { e.stopPropagation(); start(); });
    canvas.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      choose(e.offsetX < geom().centerX ? 0 : 1);
    });
    overlay.addEventListener('pointerdown', function (e) { if (e.target === overlay) start(); });

    function typing(t) {
      if (!t) return false;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return true;
      // the event target may be a non-Element node (e.g. document) — guard the call
      return typeof t.getAttribute === 'function' && t.getAttribute('role') === 'textbox';
    }
    function onKey(e) {
      if (panel.hidden || typing(e.target)) return;
      var k = e.key;
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') { e.preventDefault(); choose(0); }
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') { e.preventDefault(); choose(1); }
      else if (k === ' ' || k === 'Enter') { e.preventDefault(); if (state !== 'running') start(); }
      else if (k === 'Escape') { close(); }
    }
    document.addEventListener('keydown', onKey);

    function onStore(e) {
      if (e.key === BEST_KEY) {
        best = Math.max(best, num(e.newValue, 0));
        bestEl.textContent = pad5(best);
        ball.querySelector('.ffd-ball-best').textContent = 'HI ' + pad5(best);
      }
    }
    window.addEventListener('storage', onStore);
    window.addEventListener('resize', function () { resize(); if (state !== 'running') render(0); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); });

    var themeObserver = new MutationObserver(detectTheme);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-ds-dark-theme', 'data-theme', 'class'] });
    var sizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    if (sizeObserver) sizeObserver.observe(canvas);

    function onAppearance(e) {
      customBackground = !!(e.detail && e.detail.customBackground);
      if (state !== 'running') render(0);
    }
    document.addEventListener('ffd:appearance-change', onAppearance);
    if (globalThis.FFD_APPEARANCE && globalThis.FFD_APPEARANCE.get) {
      var saved = globalThis.FFD_APPEARANCE.get();
      customBackground = saved.mode !== 'theme' && saved.scope.panel !== false;
    }
    detectTheme();
    resize();
    render(0);

    return function dispose() {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('ffd:appearance-change', onAppearance);
      window.removeEventListener('storage', onStore);
      themeObserver.disconnect();
      if (sizeObserver) sizeObserver.disconnect();
      ballWrap.remove();
      panel.remove();
      if (ownsBox) box.remove();
    };
  }

  globalThis.FFD_DOORS = Object.assign(globalThis.FFD_DOORS || {}, { mount: mount });
})();
