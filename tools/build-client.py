"""Bundle the plain-script client sources into DSH's self-contained client entry.

DeepSeek Harness 0.2.x loads web-client plugins via window.__ModuleLoader__.load({
  id, factory }), where factory returns { apply, inject }. Relative ESM imports
inside the entry are NOT resolved, so every source is inlined here.

Run: python tools/build-client.py
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CLIENT = ROOT / 'client'
SOURCES = ['art.js', 'styles.js', 'dino.js', 'effort.js', 'appearance.js', 'slots.js']

HEADER = '''/* dsh-fatfish-dino — self-contained DSH web-client entry (generated, do not edit).
   Sources: client/art.js, styles.js, dino.js, effort.js, appearance.js, slots.js
   Rebuild with: python tools/build-client.py                                     */
window.__ModuleLoader__.load({
  id: "dsh-fatfish-dino",
  factory: function (require) {
    "use strict";
    var module = { exports: {} };

'''

FOOTER = '''
    /* ---------------- plugin body (ctx.slots / React, like dsh-codex-effort) ---------------- */
    var plugin = globalThis.FFD_SLOTS.create(require);
    module.exports = { apply: plugin.apply, inject: plugin.inject };
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
