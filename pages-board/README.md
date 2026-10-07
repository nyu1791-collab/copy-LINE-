The public board frontend is built with:

```sh
npm ci
npx vite build --config vite.pages.config.mjs
node scripts/validate-pages-board.mjs dist-pages/boards
```

Publish `dist-pages/boards` at
`https://line-rangers-fan.github.io/line-rangers-pvp/boards/` alongside the
ranking. Its API remains the existing production Worker and existing D1/R2.
The Worker code containing `worker/pages-api.mjs` must be deployed before
publishing the Pages frontend. The primary repository pins both builds to
the same `copy_source_sha` in `.production-promotion-trigger`.

Pages requests use signed anonymous viewer tokens, an exact Origin allowlist,
and the existing route permissions and rate limits. Third-party cookies are
not required. Owner activation continues on the Worker with HttpOnly cookies;
the Owner key and Owner cookie are never exposed to Pages JavaScript.

New monthly boards use verified grade-9 ultimate characters in source addition
order: even JST months reserve two slots; odd months reserve one. An official
release notice, catalog membership, four translated names, skills, images and
three distinct observations are required. A valid partial PvP sample is allowed.
Failed selected characters retain their reserved slot and are retried; lower
characters never substitute for them. Archived board IDs and posts are retained.
