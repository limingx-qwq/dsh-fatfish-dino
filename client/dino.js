/* Fatfish Dino — a Chrome-dino-style runner using AI-generated "Blue Fatfish / DeepSeek whale girl" art.
   Plain script: works both as a DSH client module side-effect import and as a <script> in the demo. */
(function () {
  'use strict';

  var BEST_KEY = 'ffd.dino.best';
  var MUTE_KEY = 'ffd.dino.mute';
  var BALL_KEY = 'ffd.ball.pos';

  function store(key, value) {
    try { if (value === undefined) return localStorage.getItem(key); localStorage.setItem(key, value); }
    catch (_) { return null; }
    return value;
  }
  function num(value, fallback) { var n = parseInt(value, 10); return isNaN(n) ? fallback : n; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function pad5(n) { return ('00000' + Math.max(0, Math.floor(n))).slice(-5); }

  var THEMES = {
    light: { sky: '#fbfcff', ink: '#1b2340', line: '#d3d9e8', cloud: '#e7ecf7', pebble: '#c3cbdd', shadow: 'rgba(40,60,110,.10)' },
    dark: { sky: '#111827', ink: '#e8edff', line: '#3a4562', cloud: '#222d47', pebble: '#465477', shadow: 'rgba(0,0,0,.25)' }
  };

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
      jump: function () { tone(520, 0.09, 'square', 0.035); },
      point: function () { tone(880, 0.12, 'sine', 0.05); setTimeout(function () { tone(1320, 0.14, 'sine', 0.045); }, 90); },
      hit: function () { tone(180, 0.28, 'sawtooth', 0.055); }
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
      obstacle: loadImage(ART.obstacle || ''),
      gameover: loadImage(ART.gameover || ''),
      ball: loadImage(ART.ball || '')
    };

    /* ---------- DOM ---------- */
    // One shared overlay root for both features; CSS custom properties live here.
    var ownsBox = false;
    var box = null;
    if (host && host.classList && host.classList.contains('ffd-root')) box = host;
    else if (host && host.querySelector) box = host.querySelector('.ffd-root');
    if (!box) {
      box = el('div', 'ffd-root');
      (host || document.body).appendChild(box);
      ownsBox = true;
    }

    var ballWrap = el('div', 'ffd-ball-wrap');
    var ball = el('button', 'ffd-ball');
    ball.type = 'button';
    ball.title = '大肥鱼跑酷 · 点击开始';
    ball.setAttribute('aria-label', '打开大肥鱼跑酷小游戏');
    ball.innerHTML = '<img alt="" src="' + (ART.ball || ART.hero || '') + '"><span class="ffd-ball-best">HI ' + pad5(num(store(BEST_KEY), 0)) + '</span>';
    ballWrap.appendChild(ball);
    box.appendChild(ballWrap);

    var panel = el('section', 'ffd-panel');
    panel.hidden = true;
    panel.setAttribute('aria-label', '大肥鱼跑酷');
    panel.innerHTML =
      '<header class="ffd-head">' +
        '<img class="ffd-logo" alt="" src="' + (ART.ball || '') + '">' +
        '<div class="ffd-title">大肥鱼跑酷 <small>Fatfish Runner · DeepSeek 娘化二创</small></div>' +
        '<div class="ffd-scores"><span>得分 <b id="ffd-score">00000</b></span><span>HI <b class="ffd-hi" id="ffd-best">' + pad5(num(store(BEST_KEY), 0)) + '</b></span></div>' +
        '<button class="ffd-icon-btn" id="ffd-mute" type="button" title="音效开关" aria-label="音效开关">' + (store(MUTE_KEY) === '1' ? '🔇' : '🔊') + '</button>' +
        '<button class="ffd-icon-btn" id="ffd-close" type="button" title="收起" aria-label="收起游戏">✕</button>' +
      '</header>' +
      '<div class="ffd-stage">' +
        '<canvas id="ffd-canvas" tabindex="0" aria-label="跑酷游戏画面，按空格键跳跃"></canvas>' +
        '<div class="ffd-overlay" id="ffd-overlay">' +
          '<img id="ffd-overlay-img" alt="" src="' + (ART.hero || '') + '">' +
          '<h3 id="ffd-overlay-title">大肥鱼，冲！</h3>' +
          '<p id="ffd-overlay-desc">跳过「Bug 仙人掌」，别让大肥鱼躺平<br><kbd>空格</kbd> / <kbd>↑</kbd> / <kbd>点击</kbd> 跳跃　<kbd>↓</kbd> 下蹲</p>' +
          '<p class="ffd-newbest" id="ffd-overlay-new" hidden></p>' +
          '<button class="ffd-play" id="ffd-play" type="button">开始游戏</button>' +
        '</div>' +
      '</div>' +
      '<footer class="ffd-foot"><span>蓝色大肥鱼 · 鲸鱼娘 DeepSeek 同人表情包梗</span><span class="ffd-spacer"></span><span class="ffd-badge" id="ffd-level">普通模式</span><span>最高分自动保存在本机</span></footer>';
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
    var levelEl = panel.querySelector('#ffd-level');
    var muteBtn = panel.querySelector('#ffd-mute');

    /* ---------- state ---------- */
    var cw = 880, ch = 240, dpr = 1;
    var state = 'idle';           // idle | running | over
    var score = 0, best = num(store(BEST_KEY), 0), distance = 0;
    var speed = 6, spawnIn = 70, last = 0, raf = 0;
    var nightAt = 100, flash = 0, isNight = false;
    var customBackground = false; // when true the canvas sky stays transparent so the glass layer shows through
    var obstacles = [], clouds = [], pebbles = [];
    var player = { x: 74, y: 0, w: 54, h: 64, vy: 0, onGround: true, duck: false, bob: 0 };
    var theme = THEMES.light;

    for (var i = 0; i < 4; i++) clouds.push({ x: i * 250 + 60, y: 30 + (i % 3) * 28, s: 0.65 + (i % 3) * 0.2 });
    for (var j = 0; j < 26; j++) pebbles.push({ x: j * 42, y: (j * 37) % 11, s: 1 + (j % 3) * 0.4 });

    function groundY() { return ch - 34; }
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
      if (!player.onGround) return;
      player.y = groundY() - player.h;
    }

    /* ---------- drawing helpers ---------- */
    function drawCloud(c) {
      ctx.fillStyle = theme.cloud;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, 24 * c.s, 9 * c.s, 0, 0, Math.PI * 2);
      ctx.ellipse(c.x + 16 * c.s, c.y - 5 * c.s, 15 * c.s, 10 * c.s, 0, 0, Math.PI * 2);
      ctx.ellipse(c.x - 16 * c.s, c.y + 2 * c.s, 13 * c.s, 7 * c.s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    function drawGround() {
      var gy = groundY();
      ctx.strokeStyle = theme.line;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, gy + 4); ctx.lineTo(cw, gy + 4); ctx.stroke();
      ctx.fillStyle = theme.pebble;
      for (var i = 0; i < pebbles.length; i++) {
        var p = pebbles[i];
        var x = ((p.x - distance * 0.55) % (cw + 60) + (cw + 60)) % (cw + 60) - 30;
        ctx.fillRect(x, gy + 12 + p.y, 3 * p.s, 2);
      }
    }
    function drawBird(o, t) {
      var flap = Math.sin(t / 7) * 5;
      ctx.save();
      ctx.translate(o.x + o.w / 2, o.y + o.h / 2);
      ctx.fillStyle = '#4d8bff';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(0, 0, o.w / 2 - 3, o.h / 2 - 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-o.w / 2 + 4, 0); ctx.lineTo(-o.w / 2 - 8, -7); ctx.lineTo(-o.w / 2 - 8, 7); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-2, -2); ctx.quadraticCurveTo(6, -10 - flap, 14, -2); ctx.quadraticCurveTo(5, -3 - flap, -2, -2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(9, -4, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#16254a'; ctx.beginPath(); ctx.arc(10, -4, 1.7, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    function drawScore() {
      ctx.fillStyle = isNight ? '#e8edff' : theme.ink;
      ctx.font = '700 15px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
      ctx.textAlign = 'right';
      ctx.fillText('HI ' + pad5(best) + '   ' + pad5(score), cw - 16, 28);
      ctx.textAlign = 'left';
    }
    function render(t) {
      ctx.clearRect(0, 0, cw, ch);
      if (!customBackground) {
        ctx.fillStyle = isNight ? (theme === THEMES.dark ? '#0b1120' : '#1b2140') : theme.sky;
        ctx.fillRect(0, 0, cw, ch);
      }
      for (var i = 0; i < clouds.length; i++) drawCloud(clouds[i]);
      drawGround();

      // player
      ctx.save();
      var bob = state === 'running' && player.onGround && !player.duck ? Math.sin(t / 45) * 2 : 0;
      var ph = player.h;
      var py = player.onGround ? groundY() - ph + bob : player.y + bob;
      if (!player.onGround) {
        ctx.translate(player.x + player.w / 2, py + ph / 2);
        ctx.rotate(clamp(player.vy * 0.012, -0.16, 0.16));
        ctx.translate(-(player.x + player.w / 2), -(py + ph / 2));
      }
      ctx.shadowColor = theme.shadow; ctx.shadowBlur = 8; ctx.shadowOffsetY = 4;
      if (imgs.hero.complete && imgs.hero.naturalWidth) ctx.drawImage(imgs.hero, player.x, py, player.w, ph);
      else { ctx.fillStyle = '#4d7cff'; ctx.fillRect(player.x, py, player.w, ph); }
      ctx.restore();

      // obstacles
      for (var k = 0; k < obstacles.length; k++) {
        var o = obstacles[k];
        if (o.type === 'bird') drawBird(o, t);
        else {
          ctx.save();
          ctx.shadowColor = theme.shadow; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3;
          if (imgs.obstacle.complete && imgs.obstacle.naturalWidth) ctx.drawImage(imgs.obstacle, o.x, o.y, o.w, o.h);
          else { ctx.fillStyle = '#39b56a'; ctx.fillRect(o.x, o.y, o.w, o.h); }
          ctx.restore();
        }
      }
      drawScore();
      if (flash > 0) {
        ctx.fillStyle = 'rgba(255,255,255,' + (flash * 0.55).toFixed(3) + ')';
        ctx.fillRect(0, 0, cw, ch);
      }
    }

    /* ---------- simulation ---------- */
    function reset() {
      score = 0; distance = 0; speed = 6; spawnIn = 62;
      obstacles = []; flash = 0; isNight = false; nightAt = 100;
      player.vy = 0; player.onGround = true; player.duck = false;
      player.h = 64; player.y = groundY() - player.h;
      scoreEl.textContent = pad5(0);
      levelEl.textContent = '普通模式';
    }
    function jump() {
      if (state !== 'running') { start(); return; }
      if (!player.onGround) return;
      player.vy = -11.6;
      player.onGround = false;
      audio.jump();
    }
    function spawn() {
      var canBird = score > 180 && Math.random() < 0.28;
      if (canBird) {
        var high = Math.random() < 0.5;
        obstacles.push({ type: 'bird', x: cw + 20, y: groundY() - (high ? 92 : 58), w: 46, h: 30 });
      } else {
        var h = 46 + Math.floor(Math.random() * 3) * 9;
        var w = 36 + Math.floor(Math.random() * 2) * 12;
        obstacles.push({ type: 'cactus', x: cw + 20, y: groundY() - h + 4, w: w, h: h });
      }
    }
    function hit(a, b) {
      var px = a.x + 9, pw = a.w - 18;
      var py = a.y + 8, ph = a.h - 12;
      return px < b.x + b.w - 4 && px + pw > b.x + 4 && py < b.y + b.h - 3 && py + ph > b.y + 3;
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
        audio.point();
      }
      overlayImg.src = ART.gameover || ART.hero || '';
      overlayTitle.textContent = isBest ? '新纪录！大肥鱼起飞了' : '大肥鱼躺平了…';
      overlayDesc.innerHTML = '本局得分 <b>' + pad5(score) + '</b>　最高分 <b>' + pad5(best) + '</b><br>按 <kbd>空格</kbd> 或点击按钮再来一局';
      overlayNew.hidden = !isBest;
      overlayNew.textContent = isBest ? '🏆 已刷新本机最高分' : '';
      playBtn.textContent = '再来一局';
      overlay.hidden = false;
    }
    function step(t, dt) {
      distance += speed * dt;
      score += 0.13 * dt * (speed / 6);
      speed = Math.min(15.5, 6 + score / 170);
      scoreEl.textContent = pad5(score);

      if (Math.floor(score) >= nightAt) {
        nightAt += 100;
        flash = 1; isNight = !isNight;
        audio.point();
        levelEl.textContent = isNight ? '夜间模式' : '普通模式';
      }
      if (flash > 0) flash = Math.max(0, flash - 0.055 * dt);

      var gy = groundY();
      player.h = player.duck ? 44 : 64;
      if (!player.onGround) {
        player.vy += 0.62 * dt;
        player.y += player.vy * dt;
        if (player.y >= gy - player.h) { player.y = gy - player.h; player.vy = 0; player.onGround = true; }
      } else {
        player.y = gy - player.h;
      }

      for (var i = 0; i < clouds.length; i++) {
        clouds[i].x -= 0.34 * speed * dt * 0.28;
        if (clouds[i].x < -50) clouds[i].x = cw + 40 + Math.random() * 90;
      }

      spawnIn -= dt;
      if (spawnIn <= 0) {
        spawn();
        spawnIn = clamp(88 - speed * 3.1, 38, 88) + Math.random() * 42;
      }
      for (var k = obstacles.length - 1; k >= 0; k--) {
        var o = obstacles[k];
        o.x -= speed * dt;
        if (o.type === 'bird') o.y += Math.sin(t / 110 + k) * 0.35 * dt;
        if (o.x + o.w < -20) { obstacles.splice(k, 1); continue; }
        var pbox = { x: player.x, y: player.onGround ? gy - player.h : player.y, w: player.w, h: player.h };
        if (hit(pbox, o)) { gameOver(); return; }
      }
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
      if (state === 'idle' && overlay.hidden) { /* paused mid-game: resume */ state = 'running'; last = 0; raf = requestAnimationFrame(loop); }
    }
    function close() {
      pause();
      panel.hidden = true;
    }
    function toggle() { panel.hidden ? open() : close(); }

    // Expose instance controls so a host React component (settings section) can drive the game.
    globalThis.FFD_DINO = globalThis.FFD_DINO || {};
    globalThis.FFD_DINO.open = open;
    globalThis.FFD_DINO.close = close;
    globalThis.FFD_DINO.toggle = toggle;
    globalThis.FFD_DINO.getBest = function () { return best; };

    // Ball: drag to reposition, click to toggle (click also covers keyboard Enter/Space).
    // Appearance lives in the host's own Settings -> Appearance page, not on the ball.
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
        suppressNextClick(); // the browser fires a click right after a drag
      }
      drag = null;
      try { ball.releasePointerCapture(e.pointerId); } catch (_) {}
    });
    ball.addEventListener('pointercancel', function () {
      drag = null;
      ball.classList.remove('is-dragging');
    });
    ball.addEventListener('click', function () {
      if (Date.now() < suppressUntil) return;
      toggle();
    });

    panel.querySelector('#ffd-close').addEventListener('click', close);
    muteBtn.addEventListener('click', function () {
      var muted = store(MUTE_KEY) === '1';
      store(MUTE_KEY, muted ? '0' : '1');
      muteBtn.textContent = muted ? '🔊' : '🔇';
    });
    playBtn.addEventListener('click', function (e) { e.stopPropagation(); start(); });
    canvas.addEventListener('pointerdown', function (e) { e.preventDefault(); jump(); });
    overlay.addEventListener('pointerdown', function (e) { if (e.target === overlay) jump(); });

    function typing(t) {
      return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable || t.getAttribute('role') === 'textbox');
    }
    function onKey(e) {
      if (panel.hidden || typing(e.target)) return;
      var k = e.key;
      if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W' || k === 'Enter') {
        e.preventDefault();
        if (state === 'running') jump(); else start();
      } else if (k === 'ArrowDown' || k === 's' || k === 'S') {
        e.preventDefault();
        if (state === 'running' && player.onGround) player.duck = true;
      } else if (k === 'Escape') {
        close();
      }
    }
    function onKeyUp(e) {
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') player.duck = false;
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('keyup', onKeyUp);

    function onStore(e) {
      if (e.key === BEST_KEY) {
        best = Math.max(best, num(e.newValue, 0));
        bestEl.textContent = pad5(best);
        ball.querySelector('.ffd-ball-best').textContent = 'HI ' + pad5(best);
      }
    }
    window.addEventListener('storage', onStore);
    window.addEventListener('resize', function () {
      resize();
      if (state !== 'running') render(0);
    });
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
      var savedAppearance = globalThis.FFD_APPEARANCE.get();
      customBackground = savedAppearance.bgMode !== 'theme' && savedAppearance.scope.panel !== false;
    }
    detectTheme();
    resize();
    render(0);

    return function dispose() {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('ffd:appearance-change', onAppearance);
      window.removeEventListener('storage', onStore);
      themeObserver.disconnect();
      if (sizeObserver) sizeObserver.disconnect();
      ballWrap.remove();
      panel.remove();
      if (ownsBox) box.remove();
    };
  }

  globalThis.FFD_DINO = Object.assign(globalThis.FFD_DINO || {}, { mount: mount });
})();
