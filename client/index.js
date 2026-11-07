/* DSH web client entry. Declared through package.json -> dsh.client -> exports["./client"].
   Plain side-effect imports keep the package build-free: no bundler, no TypeScript, no CSS pipeline. */
import './art.js'
import './styles.js'
import './dino.js'
import './effort.js'
import './appearance.js'

export const name = 'fatfish-dino-client'

export function apply(ctx) {
  if (typeof document === 'undefined') return
  if (document.getElementById('ffd-styles')) return // already mounted (HMR / duplicate profile row)

  const style = document.createElement('style')
  style.id = 'ffd-styles'
  style.textContent = globalThis.FFD_CSS || ''
  document.head.appendChild(style)

  const root = document.createElement('div')
  root.className = 'ffd-root'
  document.body.appendChild(root)

  const disposers = [
    globalThis.FFD_DINO.mount(root),
    globalThis.FFD_EFFORT.mount(root),
    globalThis.FFD_APPEARANCE.mount(root)
  ]

  const cleanup = () => {
    disposers.forEach((fn) => { try { if (typeof fn === 'function') fn() } catch (_) { /* noop */ } })
    root.remove()
    style.remove()
  }

  if (ctx && typeof ctx.effect === 'function') ctx.effect(() => cleanup)
  else window.addEventListener('pagehide', cleanup, { once: true })
  return cleanup
}
