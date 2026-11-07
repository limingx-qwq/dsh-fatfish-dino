/* DSH client plugin body, modelled on dsh-codex-effort:
   window.__ModuleLoader__ -> factory -> { apply, inject }
   apply(ctx) registers React components through ctx.slots, and uses ctx.effect
   for lifecycle cleanup. The heavy DOM engines (canvas door-dash runner,
   global background) stay in their own plain-script modules. */
(function () {
  'use strict';

  var PACKAGE_ID = 'dsh-fatfish-dino';
  var SECTION_SLOT = 'settings.section';                       // left column of the Settings panel
  var SIDEBAR_SLOT = 'sidebar.footer.action';                  // main window left-column footer
  var UTILITY_SLOT = 'conversation.session.header.utilities';  // session header quick actions
  var INJECT = ['slots'];

  function pad5(n) { return ('00000' + Math.max(0, Math.floor(n || 0))).slice(-5); }

  /** React is not a factory argument — borrow it the same way codex-effort does. */
  function resolveReact(loaderRequire) {
    try {
      if (typeof loaderRequire === 'function') {
        var viaRequire = loaderRequire('react');
        if (viaRequire && typeof viaRequire.createElement === 'function') return viaRequire;
      }
    } catch (_) { /* keep trying */ }
    try {
      if (window.React && typeof window.React.createElement === 'function') return window.React;
    } catch (_) { /* keep trying */ }
    try {
      var probe = document.querySelector('textarea, [data-composer-card], #root *') || document.body;
      if (probe) {
        var keys = Object.keys(probe);
        for (var i = 0; i < keys.length; i++) {
          if (keys[i].indexOf('__reactContainer$') !== 0 && keys[i].indexOf('__reactFiber$') !== 0) continue;
          var node = probe[keys[i]];
          var hops = node && node.return ? node.return : node;
          for (var hop = 0; hops && hop < 60; hop++) {
            if (hops.stateNode && typeof hops.stateNode.createElement === 'function') return hops.stateNode;
            hops = hops.return;
          }
        }
      }
    } catch (_) { /* no React available */ }
    return null;
  }
  function resolveReactDOM(loaderRequire) {
    try {
      if (typeof loaderRequire === 'function') {
        var dom = loaderRequire('react-dom');
        if (dom && typeof dom.createPortal === 'function') return dom;
      }
    } catch (_) {}
    try { if (window.ReactDOM && typeof window.ReactDOM.createPortal === 'function') return window.ReactDOM; } catch (_) {}
    return null;
  }

  /** Retry a few times, then render nothing instead of crashing the whole settings page. */
  function createBoundary(React, Inner) {
    if (typeof React.Component !== 'function') return Inner;
    var Boundary = class extends React.Component {
      constructor(props) { super(props); this.state = { failed: false }; this.attempts = 0; }
      static getDerivedStateFromError() { return { failed: true }; }
      componentDidCatch(error) {
        this.attempts += 1;
        if (this.attempts >= 3) return;
        var self = this;
        setTimeout(function () { try { self.setState({ failed: false }); } catch (_) {} }, 500 * this.attempts);
      }
      render() {
        if (this.state.failed) return null;
        return React.createElement(Inner, this.props);
      }
    };
    Boundary.displayName = 'FatfishAppearanceBoundary';
    return Boundary;
  }

  function createSectionComponent(React) {
    var h = React.createElement;
    return function FatfishAppearanceSection() {
      var hostRef = React.useRef ? React.useRef(null) : { current: null };
      var best = React.useState(globalThis.FFD_DOORS.getBest ? globalThis.FFD_DOORS.getBest() : 0)[0];
      React.useEffect(function () {
        if (!hostRef.current || !globalThis.FFD_APPEARANCE.mountCard) return;
        return globalThis.FFD_APPEARANCE.mountCard(hostRef.current);
      }, []);
      var refProp = React.useRef ? { ref: hostRef } : { ref: function (n) { hostRef.current = n; } };

      return h('div', { className: 'ffd-section' },
        h('div', { className: 'ffd-section-head' },
          h('h2', null, '🐳 外观与闯门'),
          h('span', null, '自定义背景 · 图片 / 视频 · 毛玻璃 · 渐变')
        ),
        h('div', { className: 'ffd-slot-game' },
          h('div', null,
            h('b', null, '大肥鱼闯门'),
            h('span', { className: 'ffd-slot-sub' }, '最高分 ' + pad5(best) + ' · ← → 选择跑道，选错即结束')
          ),
          h('button', {
            type: 'button',
            onClick: function () { if (globalThis.FFD_DOORS.open) globalThis.FFD_DOORS.open(); }
          }, '开始游戏 ▶')
        ),
        h('div', Object.assign({ className: 'ffd-slot-host' }, refProp))
      );
    };
  }

  function createSmallButton(React, label, onClick) {
    var h = React.createElement;
    return function FatfishQuickAction() {
      return h('button', { type: 'button', className: 'ffd-quick-action', onClick: onClick, title: label }, label);
    };
  }

  function create(loaderRequire) {
    var React = resolveReact(loaderRequire);
    var ReactDOM = resolveReactDOM(loaderRequire);

    function apply(ctx) {
      if (typeof document === 'undefined') return;

      /* ---- global overlay root + DOM engines ---- */
      var style = document.getElementById('ffd-styles');
      var ownsStyle = !style;
      if (!style) {
        style = document.createElement('style');
        style.id = 'ffd-styles';
        style.textContent = globalThis.FFD_CSS || '';
        document.head.appendChild(style);
      }
      var root = document.createElement('div');
      root.className = 'ffd-root';
      document.body.appendChild(root);

      var disposers = [
        globalThis.FFD_DOORS.mount(root),
        globalThis.FFD_APPEARANCE.mount(root)
      ];
      function cleanupUI() {
        disposers.forEach(function (fn) { try { if (typeof fn === 'function') fn(); } catch (_) {} });
        root.remove();
        if (ownsStyle) style.remove();
      }
      if (ctx && typeof ctx.effect === 'function') ctx.effect(function () { return cleanupUI; }, PACKAGE_ID + ':ui');
      else window.addEventListener('pagehide', cleanupUI, { once: true });

      /* ---- register into host slots (dsh-codex-effort style) ---- */
      if (!React || !ctx || !ctx.slots || typeof ctx.slots.inject !== 'function') {
        // No React / slots (older host or standalone preview): fall back to DOM sniffing.
        if (globalThis.FFD_APPEARANCE.setAutoInject) globalThis.FFD_APPEARANCE.setAutoInject(true);
        return;
      }
      if (globalThis.FFD_APPEARANCE.setAutoInject) globalThis.FFD_APPEARANCE.setAutoInject(false);

      var Section = createBoundary(React, createSectionComponent(React));
      try {
        ctx.slots.inject(SECTION_SLOT, function () {
          return ctx.slots.register({
            name: SECTION_SLOT,
            id: PACKAGE_ID,
            order: 26,
            label: function () { return '外观'; },
            title: '外观',
            icon: '🎨'
          }, Section);
        });
      } catch (e) {
        if (globalThis.FFD_APPEARANCE.setAutoInject) globalThis.FFD_APPEARANCE.setAutoInject(true);
      }

      // Left-column footer shortcut: opens the floating appearance panel from anywhere.
      try {
        ctx.slots.inject(SIDEBAR_SLOT, function () {
          return ctx.slots.register({ name: SIDEBAR_SLOT, id: PACKAGE_ID + ':appearance', order: 60 },
            createSmallButton(React, '🎨 外观', function () {
              if (globalThis.FFD_APPEARANCE.open) globalThis.FFD_APPEARANCE.open();
            }));
        });
      } catch (_) { /* slot unavailable in this build — harmless */ }

      // Session header quick action for the runner.
      try {
        ctx.slots.inject(UTILITY_SLOT, function () {
          return ctx.slots.register({ name: UTILITY_SLOT, id: PACKAGE_ID + ':runner', order: 60 },
            createSmallButton(React, '🐳 跑酷', function () {
              if (globalThis.FFD_DOORS.toggle) globalThis.FFD_DOORS.toggle();
            }));
        });
      } catch (_) { /* slot unavailable — harmless */ }
    }

    return { apply: apply, inject: INJECT };
  }

  globalThis.FFD_SLOTS = { create: create, ReactFound: function (r) { return !!resolveReact(r); } };
})();
