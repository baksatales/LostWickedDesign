# Storefront route-loading performance

## Production build comparison

Measured with the same production command, dependency lockfile, root base path,
and default Vite minification settings before and after the route extraction:

```sh
PORT=5173 BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/baksa-tales build
```

Sizes are Vite's decimal kB, rounded to two places.

| JavaScript payload | Before | After | Gzip before | Gzip after |
| --- | ---: | ---: | ---: | ---: |
| Initial public entry, including all eager JS imports | 698.17 kB | 638.58 kB | 201.38 kB | 186.62 kB |
| Site Studio, loaded on demand | included above | 34.34 kB | included above | 10.60 kB |
| Maker workspace, loaded on demand | included above | 17.12 kB | included above | 5.42 kB |
| Admin workspace, loaded on demand | included above | 10.34 kB | included above | 3.15 kB |

Public browsing avoids approximately **59.59 kB (8.5%) of minified JavaScript**,
or **14.76 kB (7.3%) gzip**, compared with the baseline. These are byte savings,
not measured page-load timings. The total code has not disappeared: private
workspaces download their own chunks when opened after access is confirmed.

The shared stylesheet is unchanged (134.37 kB, 24.22 kB gzip). The public entry
still exceeds Vite's 500 kB warning threshold; that warning has not been hidden
by raising the limit or moving eagerly required code into arbitrary vendor
chunks. Both builds also report the existing tooltip sourcemap warning.

## Loading boundaries

- Public data defaults live separately from the owner editor.
- Maker, admin and editor modules use dynamic imports. No private route is
  preloaded on hover or startup.
- The existing role gate renders before any protected lazy component is mounted.
  Setup, sign-in, access-denied, query-loading and query-error branches are
  unchanged. API authorization remains authoritative.
- `/studio-preview` still explicitly opens the local-only, unsaved playground
  without granting marketplace access.
- Route loading retains the storefront frame and shows an accessible status.
  A rejected chunk download shows reload and return-to-shop actions. Navigating
  away clears the route error; reload also clears React's cached lazy rejection.
- Supabase session initialization, path/base routing, supplied brand assets,
  database setup and launch configuration are unchanged.

## Verification

```sh
pnpm run typecheck
pnpm --filter @workspace/baksa-tales exec vitest run
node --test artifacts/baksa-tales/tests/analytics.test.mjs
# Run after the production build:
node artifacts/baksa-tales/scripts/check-route-chunks.mjs
```

Results:

- Full workspace typecheck passed.
- Eight component tests passed: existing editorial-loading checks plus public
  routes, protected setup screens, on-demand playground loading, pending chunk
  status, rejected chunk recovery and navigation away from a route error.
- Five existing analytics helper tests passed.
- Build-manifest check passed: all three private modules are dynamic entries
  and absent from the entire eager import graph. Initial public JS:
  638,575 bytes, gzip 186,618 bytes.
- Extraction comparison confirmed unchanged maker/admin component bodies,
  role-gate implementation and starter document data.
- Live preview screenshots confirmed mobile homepage artwork and layout,
  `/admin/site` showing “Access is not connected”, and actual lazy
  `/studio-preview` loading the editor and storefront preview without errors.
  Both frontend and API workflows were running successfully.

The live runtime reports authentication and database setup as disconnected.
No session, role, login or private data was fabricated. Authenticated editing,
publishing and maker/admin operations were not exercised against a real account.
No database migration, deployment or launch setting was changed.
