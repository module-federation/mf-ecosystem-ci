import path from 'node:path'
import { $, exec, installPlaywright, runInRepo } from '../../utils.ts'
import type { RunOptions } from '../../types.d.ts'

/**
 * gioboa/module-federation-vite-examples: one host/remote pair per framework, all
 * built on @module-federation/vite, with a shared Playwright spec (`e2e/app.spec.ts`)
 * that branches on the framework named in PLAYWRIGHT_TEST_COMMAND.
 */
export const VITE_EXAMPLES_REPO = 'gioboa/module-federation-vite-examples'

export const VITE_FRAMEWORKS = [
	'alpine',
	'angular',
	'astro',
	'ember',
	'lit',
	'nuxt',
	'preact',
	'react',
	'solid',
	'svelte',
	'tanstack',
	'vinext',
	'vue',
] as const
export type ViteFramework = (typeof VITE_FRAMEWORKS)[number]

// Mirrors the upstream workflow (.github/actions/test-vite): nuxt and tanstack skip the
// dev-server run, tanstack also skips preview, so it is checked by its build only.
const NO_DEV: readonly ViteFramework[] = ['nuxt', 'tanstack']
const NO_PREVIEW: readonly ViteFramework[] = ['tanstack']

/** Every example runs on the Vite plugin, which brings in runtime and sdk from core. */
export const VITE_FRAMEWORK_COVERS = [
	'@module-federation/vite',
	'@module-federation/runtime',
	'@module-federation/sdk',
]

export function viteFrameworkSuite(framework: ViteFramework) {
	return {
		covers: VITE_FRAMEWORK_COVERS,
		test: (options: RunOptions) => runViteFramework(options, framework),
	}
}

async function runViteFramework(options: RunOptions, framework: ViteFramework) {
	const repoDir = path.resolve(options.workspace, 'module-federation-vite-examples')
	// Each framework's dev and preview servers bind 4173-4175, so Playwright runs
	// one server set at a time; never run two of these suites on one machine at once.
	const playwright = (mode: 'dev' | 'preview') =>
		exec('pnpm exec playwright test', {
			cwd: repoDir,
			env: {
				PLAYWRIGHT_TEST_COMMAND: `pnpm ${framework}:${mode}`,
				PLAYWRIGHT_REPORT_DIR: `artifacts/playwright/${framework}/${mode}/report`,
				PLAYWRIGHT_TEST_RESULTS_DIR: `artifacts/playwright/${framework}/${mode}/test-results`,
			},
		})

	await runInRepo({
		...options,
		repo: VITE_EXAMPLES_REPO,
		branch: 'main',
		agent: 'pnpm',
		// Full install, exactly like upstream CI: some examples rely on binaries that only
		// another framework's packages bring in (preact's dev script runs a hoisted `tsc`).
		install: async () => {
			await $`pnpm install --no-frozen-lockfile`
		},
		test: async () => {
			await installPlaywright()
			if (!NO_DEV.includes(framework)) await playwright('dev')
			await exec('pnpm build', { cwd: path.join(repoDir, framework) })
			if (!NO_PREVIEW.includes(framework)) await playwright('preview')
		},
	})
}
