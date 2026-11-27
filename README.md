# module-federation-ecosystem-ci

Run real Module Federation projects against unreleased Module Federation packages, so
a change in `module-federation/core` (or the Vite plugin) shows up as a broken
downstream build *before* it ships.

The design follows [vite-ecosystem-ci](https://github.com/vitejs/vite-ecosystem-ci)
and [rstack-ecosystem-ci](https://github.com/rstackjs/rstack-ecosystem-ci), with one
important difference. Module Federation is not one package. Core publishes ~43 packages
(`enhanced`, `rspack`, `runtime`, `sdk`, `nextjs-mf`, `node`, `rsbuild-plugin`,
`modern-js`, `storybook-addon`, the bridges, ...). Every run therefore overrides **all**
of them at once, so plugins are always tested against the runtime they were built
with.

## How a run works

1. **Build the upstream stack.** Clone `module-federation/core` (or `module-federation/vite`)
   at a branch, tag or commit, run its package build, and `pnpm pack` every public package
   into `workspace/tarballs/<stack>/` with a `manifest.json`.
2. **Clone a downstream suite** (an examples slice, the Vite plugin repo, Astro,
   Zephyr, ...).
3. **Override every upstream package** with its tarball via `overrides` in
   `pnpm-workspace.yaml` (or `pnpm.overrides` / `resolutions` / npm `overrides`). Packages
   the downstream workspace builds itself are left alone. For example, the vite repo
   *is* `@module-federation/vite`.
4. **Install, then assert the overrides took.** After install the runner reads
   `pnpm-lock.yaml` and fails if any overridden package still resolved from the registry.
   A silent fallthrough would turn a suite green while testing nothing.
5. **Build and test** the downstream with its own scripts.

Tarballs rather than `link:` are deliberate. A linked plugin resolves `webpack` /
`@rspack/core` from the upstream checkout's `node_modules`, so the plugin and the app
can end up with two compiler instances. A packed tarball installs like a real
release, so peers resolve inside the downstream.

Instead of building, a run can also use:

- `--release <version|dist-tag>`, which resolves each package independently on npm. Packages
  are on different version lines (nextjs-mf 8.x, node 2.7.x, runtime 2.9.x), so a
  dist-tag such as `next` is usually what you want.
- `--commit <sha>`, which uses the [pkg.pr.new](https://pkg.pr.new) previews that core and
  the Vite plugin publish for pull requests.

## Stacks and suites

| Stack  | Upstream                                    | Suites |
| ------ | ------------------------------------------- | ------ |
| `core` | `module-federation/core` (all packages)     | every file in `tests/core/` |
| `vite` | `module-federation/vite` (`@module-federation/vite`) | every file in `tests/vite/` |

| Suite | Plugin(s) under test | Downstream |
| ----- | -------------------- | ---------- |
| `examples-enhanced-webpack` | `enhanced` (webpack) | nested-remote, shared-context, shared-routing, self-healing, typescript-monorepo, redux-reducer-injection |
| `examples-enhanced-rspack` | `enhanced`, `rspack` | rspack-webpack-interop, rspack-webpack-offload, complete-react-case, different-react-versions, css-isolation |
| `examples-runtime` | `runtime`, `runtime-tools`, `sdk` | error-boundary, federated-npm, dynamic-system-host, comprehensive-demo-react18, clo |
| `examples-node` | `node` | react-18-server-2-server, loadable-react-18, federated-css-react-ssr, apollo-client, react-18-code-splitting |
| `examples-nextjs-mf` | `nextjs-mf` | nextjs-csr, nextjs-ssr, nextjs-host-react-remote, i18next-nextjs-react |
| `examples-modern-js` | `modern-js`, `modern-js-v3` | bi-directional, basic-host-remote, modernjs-ssr-data-loader, modernjs-ssr |
| `examples-rsbuild-plugin` | `rsbuild-plugin` | react-preact-runtime-typescript, cra, react-manifest-example |
| `examples-storybook-addon` | `storybook-addon` | react-storybook |
| `examples-typescript` | `typescript`, `dts-plugin`, `utilities`, `native-federation-*` | typescript, typescript-react-fallback, typescript-project-references, native-federation-tests-typescript-plugins |
| `examples-vite` | `vite` (+ the core runtime it uses) | module-federation-vite-{react,vue3,svelte}, react-webpack-host-vite-remote, shared-directory |
| `vite` | runtime / sdk / dts-plugin as consumed by the Vite plugin | [module-federation/vite](https://github.com/module-federation/vite) typecheck, unit + integration tests |
| `astro` | `@module-federation/astro` (built from source) on the Vite plugin + runtime | [module-federation/astro](https://github.com/module-federation/astro) |
| `nuxt` | `@module-federation/nuxt` (built from source) on vite, enhanced, bridge-vue3 | [module-federation/nuxt](https://github.com/module-federation/nuxt): Vite and Rspack host/remote, release tests, Playwright prod + dev |
| `tanstack` | `@module-federation/tanstack` (built from source) on vite, rsbuild-plugin, runtime | [module-federation/tanstack](https://github.com/module-federation/tanstack): TanStack Start SSR, server functions, Playwright |
| `vinext` | `@module-federation/vinext` (built from source) on vite | [module-federation/vinext](https://github.com/module-federation/vinext): vinext SSR host, remote, isolated island, Playwright |
| `electron` | `@module-federation/electron` (built from source) on vite, rsbuild-plugin | [module-federation/electron](https://github.com/module-federation/electron): unit tests and a real Electron smoke launch |
| `tauri` | `@module-federation/tauri` (built from source) on vite, rsbuild-plugin, runtime | [module-federation/tauri](https://github.com/module-federation/tauri): JS plugin tests and every host/guest frontend build (the Rust crate is skipped) |
| `zephyr` | enhanced, rsbuild-plugin, runtime, vite inside Zephyr's bundler plugins | [ZephyrCloudIO/zephyr-packages](https://github.com/ZephyrCloudIO/zephyr-packages) |

### Frameworks

Two layers cover frameworks. The framework plugins (`@module-federation/nuxt`, `tanstack`,
`vinext`, `astro`, `electron`, `tauri`) live in their own repos. Their suites above build
the plugin from source at `main` against the overridden core or Vite packages.

The `framework-<name>` suites then run
[gioboa/module-federation-vite-examples](https://github.com/gioboa/module-federation-vite-examples),
the example set the Vite plugin's README points to. That repo has one host/remote pair per
framework: alpine, angular, astro, ember, lit, nuxt, preact, react, solid, svelte, tanstack,
vinext and vue. Each suite follows the same steps as that repo's CI. It runs the shared
Playwright spec against the dev servers, builds, then runs the spec against the preview
servers. nuxt has no dev run and tanstack is build-only, as upstream. These suites bind
ports 4173-4176, so run them one at a time on a single machine.

On macOS, run `framework-nuxt` from a short checkout path. Nitro's server output contains a
vue ↔ `@vue/server-renderer` symlink loop, and below a ~170-character base path the build's
directory scan fails with `ENAMETOOLONG` before the OS stops the loop. The baseline example fails
the same way without any overrides, and Linux CI is not affected.

Packages with no public downstream project are tested with **fixtures** owned by this repo
(`fixtures/<name>/`, run through `runFixture`). Each one is a small but real project,
modelled on core's own `apps/`, that installs the packed tarballs exactly like a consumer would:

| Suite | Packages | What it proves |
| ----- | -------- | -------------- |
| `fixture-bridge-react` | `bridge-react`, `bridge-react-webpack-plugin` | rsbuild host/remote: bridge render, props, two-way routing sync, unmount, deep links, `memoryRoute`. The router alias is proven by a bundle check, with a negative control |
| `fixture-bridge-vue3` | `bridge-vue3`, `bridge-shared` | Vue host/remote with vue-router: render, basename, route sync, unmount, `memoryRoute`; `dispatchPopstateEnv` from `bridge-shared` |
| `fixture-runtime-plugins` | `retry-plugin`, `observability-plugin`, `inject-external-runtime-core-plugin` | a failing remote CDN is retried onto a mirror; observability reports the recovery; remotes run on the host-injected runtime core |
| `fixture-devtools` | `devtools`, `playground` | the devtools panel `App` reads a live `window.__FEDERATION__`; the playground resolves a manifest and renders a remote with a shared React |
| `fixture-metro` | `metro`, `metro-plugin-rnc-cli`, `metro-plugin-rock`, `metro-plugin-rnef` | host and remote Android bundles through each of the three CLIs; manifest, container and exposes verified, exposed code executed |
| `fixture-esbuild` | `esbuild` | esbuild host/remote in a browser: remote renders, hooks work, the singleton React is shared |
| `fixture-rspress` | `rspress-plugin` | federated MDX fragment in SSG output, search index and `llms-full.txt`, hydration in a browser |
| `fixture-rstest` | `rstest` | rstest run importing HTTP and on-disk federated remotes |
| `fixture-tooling` | `cli`, `create-module-federation`, `third-party-dts-extractor`, `webpack-type` | `mf dts` generate/consume round trip with extracted third-party types; scaffolded templates install with the overrides and build; webpack typings typecheck |
| `fixture-treeshake` | `treeshake-server`, `treeshake-frontend` | the server's real build API tree-shakes a package; the frontend adapter serves the UI and runs the demo flow; ESM entry points |

### Coverage is enforced

Every suite exports `covers`, the upstream packages it actually exercises. Two checks keep
those claims honest:

- After install, a suite fails if a package it claims is not installed, or if it was resolved
  from npm instead of the build under test.
- `node ecosystem-ci.ts coverage --stack core` fails if any package the upstream publishes is
  claimed by no suite. It runs on every PR to this repo and on every scheduled run, so when core
  adds a package, CI goes red until it gets an example.
- `node ecosystem-ci.ts scope` reads npm's listing of the whole `@module-federation` org (78
  packages). Every package must be built by a stack, owned by a suite (`export const owns`, for
  framework plugins built from their own repo), or listed in `SCOPE_EXCLUDED` (`stacks.ts`)
  with a reason. Packages with no publish in the last year are reported as legacy. The check
  runs daily, so a new package goes red within a day of its first publish.

| Excluded | Why |
| -------- | --- |
| `side-effect-scanner`, `side-effect-modernjs-adapter` | standalone analyzer that depends on no core or Vite package, so no upstream change reaches it |
| `mcp-apps`, `mcp-apps-server` | source repository is not public |
| `data-prefetch` | removed from core after 2.3.3; nothing on `main` publishes it |

Example suites install only their slice of
[module-federation-examples](https://github.com/module-federation/module-federation-examples)
(`--filter {./<example>/**}...` plus the root), then run each example's `e2e:ci`
(build and Playwright) when it has a real one, otherwise `build`. Failures are collected,
so one broken example does not hide the rest.

## Usage

Requires Node 24+ (the runner is plain TypeScript executed by Node) and pnpm.

```sh
pnpm install

# build core main, then run every core suite
pnpm test

# one or more suites
pnpm test examples-nextjs-mf vite

# a core branch / tag / commit, or a fork
pnpm test --branch feat/my-change examples-runtime
pnpm test --repo someone/core --branch fix-thing examples-node

# build once, run many times
pnpm build-stack --stack core --commit 1a2b3c4
pnpm run-suites examples-enhanced-rspack
pnpm run-suites examples-node

# no build: npm dist-tag / version, or pkg.pr.new previews for a PR commit
pnpm run-suites --release next examples-vite
pnpm run-suites --commit 1a2b3c4 astro

# the Vite plugin as the upstream
pnpm test --stack vite
pnpm run-suites --stack vite --release latest astro

# find the core commit that broke a suite
pnpm bisect --good v2.9.0 examples-modern-js

pnpm list            # core suites
pnpm list --stack vite
```

Pass `--verify` to run the downstream's own tests on its own lockfile first, which shows
whether a failure is pre-existing.

Everything is cloned into `workspace/`, which is disposable and git-ignored.

## GitHub Actions

`.github/workflows/ecosystem-ci.yml` runs both stacks against `main` every weekday and can
be dispatched manually with a stack, ref type (`branch`, `tag`, `commit`, `pkg-pr-new`,
`release`), ref, optional fork and suite list. `_run.yml` builds and packs the upstream once,
uploads the tarballs as an artifact, and fans out one job per suite.

## Adding a suite

Create `tests/<stack>/<name>.ts` exporting `test(options)`:

```ts
import { runInRepo } from '../../utils.ts'
import type { RunOptions } from '../../types.d.ts'

export async function test(options: RunOptions) {
	await runInRepo({
		...options,
		repo: 'owner/repo',
		branch: 'main',
		build: 'build',          // package.json script or raw command
		test: ['typecheck', 'test'],
	})
}
```

For module-federation-examples, list example directories instead:

```ts
import { runExamples } from '../_shared/examples.ts'
export const test = (options) => runExamples(options, ['basic-host-remote'])
```

To share a suite between stacks, re-export it: `export { covers, owns, test } from '../core/astro.ts'`.

Every suite exports `covers` (the upstream packages it exercises). A suite whose repo
publishes its own `@module-federation/*` package also exports `owns`; that is what keeps
`scope` green.
