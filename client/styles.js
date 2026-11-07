/* Fatfish Dino — all styles are scoped under .ffd-* so the plugin never leaks into DSH. */
globalThis.FFD_CSS = String.raw`

.ffd-root {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  pointer-events: none;
  --ffd-blue: #2f6bff;
  --ffd-violet: #8b46ef;
  --ffd-ink: #1b2340;
  --ffd-sub: #6b7590;
  --ffd-card: #ffffff;
  --ffd-track: #e7eaf1;
  --ffd-line: #eceff6;
  --ffd-shadow: 0 18px 48px rgba(22, 34, 78, .18), 0 2px 8px rgba(22, 34, 78, .08);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  color: var(--ffd-ink);
  box-sizing: border-box;
}
.ffd-root[data-ffd-theme="dark"] {
  --ffd-ink: #eef2ff;
  --ffd-sub: #98a3bf;
  --ffd-card: #1b2132;
  --ffd-track: #2c344a;
  --ffd-line: #303951;
  --ffd-shadow: 0 18px 48px rgba(0, 0, 0, .5), 0 2px 8px rgba(0, 0, 0, .3);
}
.ffd-root *, .ffd-root *::before, .ffd-root *::after { box-sizing: border-box; }
.ffd-root button { font: inherit; cursor: pointer; }
.ffd-root > * { pointer-events: auto; }

/* ---------------- floating ball ---------------- */
.ffd-ball {
  position: fixed;
  z-index: 2147483000;
  right: 26px;
  bottom: 26px;
  width: 58px;
  height: 58px;
  padding: 0;
  border: 2px solid rgba(255, 255, 255, .92);
  border-radius: 50%;
  background: linear-gradient(145deg, #6ba8ff, #4a63e7 55%, #9b5cf5);
  box-shadow: 0 10px 26px rgba(58, 92, 220, .42), inset 0 2px 6px rgba(255, 255, 255, .45);
  overflow: hidden;
  transition: transform .18s cubic-bezier(.2, .9, .3, 1.4), box-shadow .18s ease;
  touch-action: none;
  user-select: none;
}
.ffd-ball:hover { transform: scale(1.09) translateY(-2px); box-shadow: 0 14px 32px rgba(58, 92, 220, .55); }
.ffd-ball:active { transform: scale(.96); }
.ffd-ball.is-dragging { transition: none; cursor: grabbing; }
.ffd-ball img { width: 100%; height: 100%; object-fit: cover; display: block; pointer-events: none; }
.ffd-ball-dot {
  position: absolute; right: 3px; top: 3px; width: 12px; height: 12px;
  border-radius: 50%; background: #ff4d6d; border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,.25);
}
.ffd-ball-best {
  position: absolute; left: 0; right: 0; bottom: 0;
  font-size: 9px; font-weight: 800; letter-spacing: .3px; color: #fff;
  background: rgba(20, 28, 60, .62); text-align: center; padding: 1px 0 2px;
  pointer-events: none;
}

/* ---------------- game panel ---------------- */
.ffd-panel {
  position: fixed;
  z-index: 2147483001;
  right: 26px;
  bottom: 96px;
  width: min(880px, calc(100vw - 40px));
  background: var(--ffd-card);
  border: 1px solid var(--ffd-line);
  border-radius: 20px;
  box-shadow: var(--ffd-shadow);
  overflow: hidden;
  transform-origin: bottom right;
  animation: ffd-pop .22s cubic-bezier(.2, .9, .3, 1.25);
}
.ffd-panel[hidden] { display: none; }
@keyframes ffd-pop { from { opacity: 0; transform: scale(.88) translateY(12px); } to { opacity: 1; transform: none; } }
.ffd-head {
  display: flex; align-items: center; gap: 12px;
  padding: 11px 14px; border-bottom: 1px solid var(--ffd-line);
}
.ffd-logo {
  width: 30px; height: 30px; border-radius: 9px; object-fit: cover;
  background: linear-gradient(145deg, #6ba8ff, #9b5cf5);
}
.ffd-title { font-size: 13px; font-weight: 800; letter-spacing: .2px; }
.ffd-title small { display: block; font-size: 10px; font-weight: 500; color: var(--ffd-sub); margin-top: 1px; }
.ffd-scores { margin-left: auto; display: flex; align-items: baseline; gap: 12px; font-variant-numeric: tabular-nums; }
.ffd-scores b { font-size: 18px; font-weight: 800; letter-spacing: 1px; }
.ffd-scores span { font-size: 11px; color: var(--ffd-sub); }
.ffd-scores .ffd-hi { color: var(--ffd-violet); font-weight: 700; }
.ffd-icon-btn {
  width: 30px; height: 30px; display: grid; place-items: center;
  border: 1px solid var(--ffd-line); border-radius: 9px;
  background: transparent; color: var(--ffd-sub); font-size: 14px; line-height: 1;
}
.ffd-icon-btn:hover { color: var(--ffd-ink); background: var(--ffd-track); }

.ffd-stage { position: relative; width: 100%; background: #fbfcff; }
.ffd-root[data-ffd-theme="dark"] .ffd-stage { background: #111827; }
.ffd-stage canvas { display: block; width: 100%; height: 240px; touch-action: manipulation; }
.ffd-overlay {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; text-align: center; padding: 16px;
  background: #fbfcff;
}
.ffd-root[data-ffd-theme="dark"] .ffd-overlay { background: #111827; }
.ffd-overlay[hidden] { display: none; }
.ffd-overlay img { width: 84px; height: 84px; object-fit: contain; }
.ffd-root[data-ffd-theme="dark"] .ffd-overlay img { filter: drop-shadow(0 4px 14px rgba(90,130,255,.35)); }
.ffd-overlay h3 { margin: 0; font-size: 17px; font-weight: 800; }
.ffd-overlay p { margin: 0; font-size: 12px; color: var(--ffd-sub); line-height: 1.7; }
.ffd-overlay kbd {
  display: inline-block; padding: 1px 6px; border: 1px solid var(--ffd-line);
  border-bottom-width: 2px; border-radius: 5px; background: var(--ffd-card);
  font: 11px/1.5 ui-monospace, monospace; color: var(--ffd-ink);
}
.ffd-play {
  margin-top: 4px; padding: 9px 24px; border: 0; border-radius: 999px;
  background: linear-gradient(100deg, var(--ffd-blue), var(--ffd-violet));
  color: #fff; font-size: 13px; font-weight: 800; letter-spacing: .5px;
  box-shadow: 0 6px 16px rgba(70, 90, 230, .35);
}
.ffd-play:hover { filter: brightness(1.08); }
.ffd-newbest { color: #e0559a; font-weight: 800; font-size: 12px; }
.ffd-foot {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 9px 14px; border-top: 1px solid var(--ffd-line);
  font-size: 11px; color: var(--ffd-sub);
}
.ffd-foot .ffd-spacer { flex: 1; }
.ffd-badge {
  padding: 2px 8px; border-radius: 999px; background: var(--ffd-track);
  color: var(--ffd-ink); font-size: 10px; font-weight: 700;
}


/* ---------------- floating ball: gear + wrap ---------------- */
.ffd-ball-wrap {
  position: fixed; z-index: 2147483000;
  right: 26px; bottom: 26px; width: 58px; height: 58px;
  pointer-events: none;
}
.ffd-ball-wrap > * { pointer-events: auto; }
.ffd-ball-wrap .ffd-ball { position: absolute; left: 0; top: 0; right: auto; bottom: auto; }
/* ---------------- custom background / frosted glass ---------------- */
.ffd-root [hidden] { display: none !important; }
.ffd-bg-layer {
  display: none; position: absolute; inset: 0; z-index: 0;
  pointer-events: none; border-radius: inherit;
  background: var(--ffd-bg, var(--ffd-card));
  opacity: var(--ffd-bg-alpha, 1);
  -webkit-backdrop-filter: blur(var(--ffd-blur, 0px)) saturate(var(--ffd-sat, 100%));
  backdrop-filter: blur(var(--ffd-blur, 0px)) saturate(var(--ffd-sat, 100%));
}
.ffd-themed > .ffd-bg-layer { display: block; }
.ffd-themed > .ffd-bg-layer::after {
  content: ''; position: absolute; inset: 0; border-radius: inherit;
  pointer-events: none; background: rgba(6, 10, 24, var(--ffd-dim, .22));
}
.ffd-themed .ffd-head, .ffd-themed .ffd-foot, .ffd-themed .ffd-appe-head,
.ffd-themed .ffd-appe-body { text-shadow: 0 1px 2px rgba(0, 0, 0, .35); }
.ffd-themed {
  background: transparent !important;
  border-color: rgba(255, 255, 255, .22) !important;
  border-radius: var(--ffd-radius, 20px) !important;
  box-shadow: 0 18px 48px rgba(30, 44, 110, .35), inset 0 0 0 1px rgba(255, 255, 255, .07) !important;
}
.ffd-themed .ffd-head, .ffd-themed .ffd-stage, .ffd-themed .ffd-foot,
.ffd-themed .ffd-appe-head,
.ffd-themed .ffd-appe-body, .ffd-themed .ffd-appe-foot { position: relative; z-index: 1; }
.ffd-themed .ffd-head, .ffd-themed .ffd-foot,
.ffd-themed .ffd-appe-head, .ffd-themed .ffd-appe-foot { border-color: rgba(255, 255, 255, .14) !important; }
.ffd-themed .ffd-stage { background: transparent !important; }
.ffd-themed .ffd-overlay {
  background: rgba(20, 28, 50, .45);
  background: color-mix(in srgb, var(--ffd-card) 55%, transparent);
  -webkit-backdrop-filter: blur(5px); backdrop-filter: blur(5px);
}
.ffd-ball.ffd-themed {
  border-radius: 50% !important;
  background: var(--ffd-ball-bg) !important;
  opacity: var(--ffd-ball-alpha, 1);
  border-color: rgba(255, 255, 255, .55);
  -webkit-backdrop-filter: blur(var(--ffd-blur, 0px)) saturate(var(--ffd-sat, 100%));
  backdrop-filter: blur(var(--ffd-blur, 0px)) saturate(var(--ffd-sat, 100%));
  box-shadow: 0 10px 26px rgba(58, 92, 220, .42),
              0 0 var(--ffd-glow-px, 18px) rgba(130, 150, 255, .55),
              inset 0 2px 6px rgba(255, 255, 255, .35);
}

/* ---------------- appearance studio ---------------- */
.ffd-appearance {
  position: fixed; z-index: 2147483003;
  width: 340px; max-height: min(620px, calc(100vh - 24px));
  display: flex; flex-direction: column;
  background: var(--ffd-card); border: 1px solid var(--ffd-line);
  border-radius: 18px; box-shadow: var(--ffd-shadow);
  overflow: hidden; animation: ffd-pop .2s ease-out;
}
.ffd-appe-head { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-bottom: 1px solid var(--ffd-line); }
.ffd-appe-head b { font-size: 13px; }
.ffd-appe-head small { display: block; font-size: 10px; color: var(--ffd-sub); margin-top: 1px; }
.ffd-appe-head .ffd-icon-btn { margin-left: auto; }
.ffd-appe-body { flex: 1; overflow: auto; padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; }
.ffd-appe-foot { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-top: 1px solid var(--ffd-line); }
.ffd-appe-foot > button:not(.ffd-play) {
  padding: 5px 9px; border: 1px solid var(--ffd-line); border-radius: 8px;
  background: transparent; color: var(--ffd-sub); font-size: 11px;
}
.ffd-appe-foot > button:not(.ffd-play):hover { color: var(--ffd-ink); background: var(--ffd-track); }
.ffd-appe-foot .ffd-play { margin: 0 0 0 auto; padding: 7px 18px; font-size: 12px; }
.ffd-field > label, .ffd-row > label, .ffd-slider-row > label {
  font-size: 11px; font-weight: 700; color: var(--ffd-sub); white-space: nowrap;
}
.ffd-field { display: flex; flex-direction: column; gap: 6px; }
.ffd-row { display: flex; align-items: center; gap: 8px; }
.ffd-slider-row { display: flex; align-items: center; gap: 8px; }
.ffd-slider-row input[type="range"] { flex: 1; min-width: 0; }
.ffd-slider-row output { width: 44px; text-align: right; font-size: 11px; font-variant-numeric: tabular-nums; color: var(--ffd-ink); }
.ffd-root input[type="range"] { accent-color: var(--ffd-blue); height: 18px; }
.ffd-root input[type="color"] { width: 36px; height: 26px; padding: 0; border: 0; border-radius: 6px; background: transparent; cursor: pointer; }
.ffd-root input[type="text"] {
  flex: 1; min-width: 0; height: 26px; padding: 0 8px; font: inherit; font-size: 11px;
  border: 1px solid var(--ffd-line); border-radius: 7px;
  background: var(--ffd-card); color: var(--ffd-ink); outline: none;
}
.ffd-root input[type="text"]:focus { border-color: var(--ffd-blue); }
.ffd-root input[type="file"] { flex: 1; min-width: 0; font-size: 10px; color: var(--ffd-sub); }
.ffd-root input[type="checkbox"] { accent-color: var(--ffd-blue); width: 15px; height: 15px; }
.ffd-seg { display: flex; gap: 4px; }
.ffd-seg button {
  flex: 1; padding: 6px 2px; border: 1px solid var(--ffd-line); border-radius: 8px;
  background: transparent; color: var(--ffd-sub); font-size: 11px;
}
.ffd-seg button.on { background: linear-gradient(100deg, var(--ffd-blue), var(--ffd-violet)); border-color: transparent; color: #fff; font-weight: 700; }
.ffd-presets { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.ffd-presets button {
  padding: 4px; border: 1px solid var(--ffd-line); border-radius: 9px;
  background: transparent; color: var(--ffd-sub); font-size: 10px;
}
.ffd-presets button.on { border-color: var(--ffd-blue); color: var(--ffd-ink); }
.ffd-presets i { display: block; height: 22px; border-radius: 6px; margin-bottom: 3px; }
.ffd-switch-row span { font-size: 10px; color: var(--ffd-sub); }
.ffd-scope { display: flex; flex-wrap: wrap; gap: 10px; }
.ffd-scope label { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: var(--ffd-ink); }
.ffd-divider { height: 1px; background: var(--ffd-line); margin: 2px 0; }
.ffd-hint { font-size: 10px; color: var(--ffd-sub); line-height: 1.5; }

/* ---------------- embedded settings card inside the HOST Appearance page ---------------- */
.ffd-root.ffd-embedded-root {
  position: relative; inset: auto; z-index: auto;
  width: auto; height: auto; display: block;
  pointer-events: auto; margin: 14px 0 18px;
}
.ffd-appe-card {
  position: relative; overflow: hidden;
  border: 1px solid var(--ffd-line); border-radius: 14px;
  background: var(--ffd-card); box-shadow: 0 6px 22px rgba(10, 18, 42, .12);
}
.ffd-appe-card.ffd-collapsed .ffd-appe-body,
.ffd-appe-card.ffd-collapsed .ffd-appe-foot { display: none !important; }
.ffd-appe-card .ffd-appe-done { display: none; }
.ffd-appe-card .ffd-appe-body { max-height: 460px; }
.ffd-appe-enable {
  margin-left: auto; display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; color: var(--ffd-sub); white-space: nowrap;
}
.ffd-appe-head .ffd-icon-btn { margin-left: 8px; }
.ffd-mini {
  padding: 4px 9px; border: 1px solid var(--ffd-line); border-radius: 8px;
  background: transparent; color: var(--ffd-sub); font-size: 11px;
}
.ffd-mini:hover { color: var(--ffd-ink); background: var(--ffd-track); }
.ffd-root select {
  height: 26px; padding: 0 6px; font: inherit; font-size: 11px;
  border: 1px solid var(--ffd-line); border-radius: 7px;
  background: var(--ffd-card); color: var(--ffd-ink); outline: none;
}
.ffd-root textarea {
  width: 100%; resize: vertical; padding: 6px 8px; font: 11px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  border: 1px solid var(--ffd-line); border-radius: 8px;
  background: var(--ffd-card); color: var(--ffd-ink); outline: none;
}
.ffd-root textarea:focus { border-color: var(--ffd-blue); }
.ffd-hint { font-size: 10px; color: var(--ffd-sub); line-height: 1.6; }
.ffd-block-media > .ffd-mini { align-self: flex-start; }

/* ---------------- global UI background layer ---------------- */
.ffd-global-bg {
  position: fixed; inset: 0; z-index: -1;
  display: none; overflow: hidden; pointer-events: none;
  background: #0d1120;
}
.ffd-global-bg.ffd-active { display: block; }
.ffd-global-gradient, .ffd-global-media, .ffd-global-scrim { position: absolute; inset: 0; }
.ffd-global-gradient { background: #0d1120; }
.ffd-global-media img, .ffd-global-media video {
  width: 100%; height: 100%; display: block;
  object-fit: cover; object-position: center;
  filter: blur(var(--ffd-media-blur, 0px));
  transform: scale(1.05);
}
.ffd-global-scrim { background: rgba(4, 7, 18, var(--ffd-bg-dim, .25)); }
html.ffd-global { background: transparent !important; }

/* ---------------- host slot surfaces (rendered by React INSIDE DSH, outside .ffd-root) ---------------- */
.ffd-section {
  --ffd-ink: #1b2340; --ffd-sub: #6b7590; --ffd-card: #ffffff;
  --ffd-line: #e8ecf6; --ffd-blue: #2f6bff; --ffd-violet: #8b46ef;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  color: var(--ffd-ink); padding: 4px 0 24px;
}
html[data-ds-dark-theme="true"] .ffd-section,
html[data-theme="dark"] .ffd-section,
html.dark .ffd-section {
  --ffd-ink: #eef2ff; --ffd-sub: #98a3bf; --ffd-card: #1b2132; --ffd-line: #303951;
}
.ffd-section-head { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
.ffd-section-head h2 { margin: 0; font-size: 16px; font-weight: 800; }
.ffd-section-head span { font-size: 11px; color: var(--ffd-sub); }
.ffd-slot-game {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 12px 14px; margin-bottom: 14px;
  border: 1px solid var(--ffd-line); border-radius: 14px; background: var(--ffd-card);
}
.ffd-slot-game b { display: block; font-size: 13px; }
.ffd-slot-sub { display: block; font-size: 11px; color: var(--ffd-sub); margin-top: 2px; }
.ffd-slot-game button {
  margin-left: auto; padding: 8px 16px; border: 0; border-radius: 999px;
  background: linear-gradient(100deg, var(--ffd-blue), var(--ffd-violet));
  color: #fff; font-size: 12px; font-weight: 800; white-space: nowrap; cursor: pointer;
}
.ffd-slot-game button:hover { filter: brightness(1.1); }
.ffd-slot-host { display: block; }
.ffd-quick-action {
  padding: 5px 10px; border: 1px solid var(--ffd-line, #3a4562); border-radius: 9px;
  background: transparent; color: inherit; font-size: 11px; cursor: pointer;
}
.ffd-quick-action:hover { background: rgba(127, 150, 220, .14); }

@media (max-width: 640px) {
  .ffd-panel { right: 12px; left: 12px; bottom: 92px; width: auto; }
  .ffd-stage canvas { height: 200px; }
  .ffd-appearance { width: min(340px, calc(100vw - 24px)); }
  .ffd-ball-wrap { right: 14px; bottom: 14px; }
}
`;
