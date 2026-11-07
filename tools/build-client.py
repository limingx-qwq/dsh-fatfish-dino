"""Bundle the plain-script client sources into DSH's self-contained client entry.

DeepSeek Harness 0.2.x loads web-client plugins via window.__ModuleLoader__.load({
  id, factory }), where factory returns { apply, inject }. Relative ESM imports
inside the entry are NOT resolved, so every source is inlined here.

Run: python tools/build-client.py
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CLIENT = ROOT / 'client'
SOURCES = ['art.js', 'styles.js', 'dino.js', 'effort.js', 'appearance.js']

HEADER = '''/* dsh-fatfish-dino — self-contained DSH web-client entry (generated, do not edit).
   Sources: client/art.js, styles.js, dino.js, effort.js, appearance.js
   Rebuild with: python tools/build-client.py                                     */
window.__ModuleLoader__.load({
  id: "dsh-fatfish-dino",
  factory: function (require) {
    "use strict";
    var module = { exports: {} };

'''

FOOTER = '''
    /* ---------------- plugin body ---------------- */
    var inject = [];

    function apply(ctx) {
      if (typeof document === 'undefined') return;
      if (document.getElementById('ffd-styles')) return; // HMR / duplicate row

      var style = document.createElement('style');
      style.id = 'ffd-styles';
      style.textContent = globalThis.FFD_CSS || '';
      document.head.appendChild(style);

      var root = document.createElement('div');
      root.className = 'ffd-root';
      document.body.appendChild(root);

      var disposers = [
        globalThis.FFD_DINO.mount(root),
        globalThis.FFD_EFFORT.mount(root),
        globalThis.FFD_APPEARANCE.mount(root)
      ];

      function cleanup() {
        disposers.forEach(function (fn) { try { if (typeof fn === 'function') fn(); } catch (_) {} });
        root.remove();
        style.remove();
      }
      if (ctx && typeof ctx.effect === 'function') {
        ctx.effect(function () { return cleanup; }, 'dsh-fatfish-dino:ui');
      } else {
        window.addEventListener('pagehide', cleanup, { once: true });
      }
      return cleanup;
    }

    module.exports = { apply: apply, inject: inject };
    return module.exports;
  }
});
'''


def main():
    chunks = [HEADER]
    for name in SOURCES:
        text = (CLIENT / name).read_text(encoding='utf-8').rstrip('\n')
        chunks.append('    /* ==== %s ==== */\n%s\n' % (name, text))
    chunks.append(FOOTER)
    out = ROOT / 'client.js'
    out.write_text('\n'.join(chunks), encoding='utf-8')
    print('wrote', out.relative_to(ROOT), out.stat().st_size, 'bytes')


if __name__ == '__main__':
    main()
