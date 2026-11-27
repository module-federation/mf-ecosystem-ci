import type { Stack, StackDefinition } from './types.d.ts'

/**
 * Upstream repositories whose packages we override in downstream suites.
 *
 * `core` publishes ~40 packages (`@module-federation/enhanced`, `rspack`, `runtime`,
 * `nextjs-mf`, `node`, `rsbuild-plugin`, `modern-js`, `storybook-addon`, ...).
 * `vite` publishes `@module-federation/vite` from its own repository.
 */
export const STACKS: Record<Stack, StackDefinition> = {
	core: {
		repo: 'module-federation/core',
		branch: 'main',
		build: 'pnpm run build:packages',
		verify: 'pnpm run test:packages',
		pkgPrNew: ['https://pkg.pr.new/module-federation/core/{name}@{sha}'],
	},
	vite: {
		repo: 'module-federation/vite',
		branch: 'main',
		build: 'pnpm run build',
		verify: 'pnpm run test',
		pkgPrNew: ['https://pkg.pr.new/{name}@{sha}'],
		// The repo's examples are workspace packages without `private: true`.
		packages: ['@module-federation/vite'],
	},
}

export function isStack(value: string): value is Stack {
	return Object.hasOwn(STACKS, value)
}

/**
 * Actively published `@module-federation/*` packages that no stack builds and no suite owns,
 * each with the reason it is not tracked. `node ecosystem-ci.ts scope` fails on any package
 * published in the last year that is in none of: a stack, a suite's `owns`, or this list.
 * Packages with no publish in the last year are reported as legacy and do not fail.
 */
export const SCOPE_EXCLUDED: Record<string, string> = {
	'@module-federation/side-effect-scanner':
		'standalone static analyzer; depends on no core or vite package, so no upstream change reaches it',
	'@module-federation/side-effect-modernjs-adapter': 'adapter for side-effect-scanner; same as above',
	'@module-federation/mcp-apps': 'source repository (module-federation/mcp-apps) is not public',
	'@module-federation/mcp-apps-server': 'alpha companion of mcp-apps; source repository is not public',
	'@module-federation/data-prefetch': 'removed from core after 2.3.3; nothing on main publishes it any more',
}
