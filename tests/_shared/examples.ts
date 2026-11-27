import fs from 'node:fs'
import path from 'node:path'
import { $, exec, installPlaywright, runAll, runInRepo } from '../../utils.ts'
import type { Overrides, RunOptions } from '../../types.d.ts'

export const EXAMPLES_REPO = 'module-federation/module-federation-examples'

export interface Example {
	/** Top-level directory in module-federation-examples. */
	dir: string
	/** Script to run from the example root. Defaults to `e2e:ci` when it is a real e2e run, else `build`. */
	script?: string
}

/**
 * Run a curated slice of module-federation-examples against the overridden packages.
 * Only the selected examples (and the workspace root, which owns Playwright) are
 * installed, which keeps each suite far below a full install of the ~100 examples.
 */
export async function runExamples(
	options: RunOptions,
	examples: (string | Example)[],
	overrides: Overrides = {},
) {
	const list: Example[] = examples.map((e) => (typeof e === 'string' ? { dir: e } : e))
	const repoDir = path.resolve(options.workspace, 'module-federation-examples')
	const filters = list.map((e) => `--filter {./${e.dir}/**}...`).join(' ')
	let playwrightReady = false

	await runInRepo({
		...options,
		repo: EXAMPLES_REPO,
		branch: 'master',
		agent: 'pnpm',
		overrides,
		install: async () => {
			await $`pnpm install --no-frozen-lockfile --config.strict-peer-dependencies=false --filter . ${filters}`
		},
		test: async () => {
			await runAll(
				'examples',
				list.map((e) => e.dir),
				async (dir) => {
					const example = list.find((e) => e.dir === dir)!
					const exampleDir = path.join(repoDir, dir)
					const scripts = JSON.parse(fs.readFileSync(path.join(exampleDir, 'package.json'), 'utf-8'))
						.scripts as Record<string, string> | undefined
					const script = example.script ?? pickScript(scripts ?? {})
					if (!scripts?.[script]) throw new Error(`${dir} has no "${script}" script`)
					if (script.includes('e2e') && !playwrightReady) {
						await installPlaywright()
						playwrightReady = true
					}
					await exec(`pnpm run ${script}`, { cwd: exampleDir })
				},
			)
		},
	})
}

function pickScript(scripts: Record<string, string>) {
	const e2e = scripts['e2e:ci']
	if (e2e && !/no e2e/i.test(e2e)) return 'e2e:ci'
	return 'build'
}
