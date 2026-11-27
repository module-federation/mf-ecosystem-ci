# AGENTS.md

- Runner is plain TS run by Node 24 (`node ecosystem-ci.ts`). Use erasable syntax only, with `.ts` import extensions. No build step.
- `pnpm check` = oxlint + tsc. CI also imports every suite module.
- Stacks live in `stacks.ts`; suites in `tests/<stack>/<suite>.ts` export `test(options: RunOptions)`. Files starting with `_` are not suites.
- Upstream packages are overridden as packed tarballs (`workspace/tarballs/<stack>/manifest.json`), never `link:`. Linked plugins pull a second webpack/rspack instance.
- `runInRepo` skips overrides for packages the downstream workspace owns, and `assertOverridesResolved` fails the run if any override fell through to the registry. Keep both.
- Example suites go through `tests/_shared/examples.ts`. They use a filtered install and `e2e:ci` when it is real, else `build`.
- Coverage: every suite exports `covers`; `node ecosystem-ci.ts coverage --stack <s>` must say all packages covered (CI gate). Claim only packages the suite actually runs; an installed-but-unused dep is not coverage.
- Packages with no public downstream example get a fixture: `fixtures/<name>/` + `tests/core/fixture-<name>.ts` via `runFixture`. Fixtures have no lockfile, use semver ranges for MF deps, and each one owns a port range (bridges 41xx, runtime-plugins/devtools 42xx, metro 43xx, esbuild/rspress/rstest 44xx, tooling 45xx, treeshake 46xx).
- Framework plugins published from their own repos (nuxt, tanstack, vinext, astro, electron, tauri) have a suite exporting `owns`. `node ecosystem-ci.ts scope` checks the whole npm org: each package must be in a stack, a suite's `owns`, or `SCOPE_EXCLUDED` with a reason.
- `framework-<name>` suites (gioboa/module-federation-vite-examples) share ports 4173-4176: never run two at once locally.
- macOS: nuxt builds (`framework-nuxt`) fail with ENAMETOOLONG when the checkout path is long (~170+ chars). Nitro's output has a vue <-> @vue/server-renderer symlink loop and the scan overflows PATH_MAX (1024) before ELOOP. Not an MF bug, and CI on Linux is unaffected. Run from a short path (e.g. a copy in /tmp).
- Stacks whose repo has public-but-unpublished workspace packages list `packages` in `stacks.ts` (vite does); otherwise pack/release/pkg.pr.new would pick up examples.
- pnpm gotcha: overrides do not apply to auto-installed peers. Anything that peers on `@module-federation/runtime-tools` (`@rspack/core`, inject-external-runtime-core-plugin) can pull it from npm and trip `assertOverridesResolved`; fixtures list `@module-federation/runtime-tools` as a direct dependency.
- Known upstream bugs stay as failing assertions (the suite goes red); never weaken a check to get green.
- `workspace/` is disposable; never commit it.
