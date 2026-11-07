/* Server-side plugin row referenced by cordis.patch.yml.
   Everything user-visible lives in the browser entry (dsh.client), so the bundle
   needs no server services, no routes and no extra dependencies. */
export const name = 'fatfish-dino'

export function apply(ctx) {
  // Intentionally empty: the patch row only needs a loadable module so DSH
  // registers the bundle and activates its dsh.client entry on the web profile.
  if (ctx && typeof ctx.effect === 'function') ctx.effect(() => () => {})
}
