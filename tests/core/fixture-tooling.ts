import fs from 'node:fs'
import path from 'node:path'
import { exec, runAll, runFixture } from '../../utils.ts'
import type { RunOptions } from '../../types.d.ts'

/**
 * Developer tooling around Module Federation (fixtures/tooling):
 * - `mf dts` from @module-federation/cli generates types for an rspack remote (with
 *   third-party types extracted by @module-federation/third-party-dts-extractor), then a
 *   host fetches them over HTTP with the standalone CLI and typechecks against them.
 * - @module-federation/webpack-type typechecks the way core aliases `webpack` to it.
 * - create-module-federation scaffolds projects before install, so they install with the
 *   overrides and are then built with their own scripts.
 */
export const covers = [
	'@module-federation/cli',
	'create-module-federation',
	'@module-federation/third-party-dts-extractor',
	'@module-federation/webpack-type',
	'@module-federation/dts-plugin',
	'@module-federation/enhanced',
	'@module-federation/rspack',
	// what the scaffolded projects depend on
	'@module-federation/rsbuild-plugin',
	'@module-federation/modern-js-v3',
]

/** Templates scaffolded non-interactively: `create-module-federation -d <dir> -t <template> -n <name>`. */
const TEMPLATES = ['provider-rslib', 'provider-modern', 'provider-rsbuild']

const mfName = (template: string) => `scaffolded_${template.replaceAll('-', '_')}`

/** `pnpm dlx` spec for the generator under test: a tarball/URL as-is, or a registry version. */
function generatorSpec(options: RunOptions) {
	const spec = options.stackOverrides['create-module-federation']
	if (!spec) throw new Error('create-module-federation is not part of the stack overrides')
	return /^(file:|https?:)/.test(spec) ? spec : `create-module-federation@${spec}`
}

/**
 * The generated projects get @module-federation/runtime-tools only as an (auto-installed) peer
 * of inject-external-runtime-core-plugin, and pnpm resolves auto-installed peers from the
 * registry without applying overrides. Declare it next to the template's own MF dependency,
 * with the same range, so it resolves to the build under test like in every other fixture.
 */
function declareRuntimeToolsPeer(projectDir: string) {
	const file = path.join(projectDir, 'package.json')
	const pkg = JSON.parse(fs.readFileSync(file, 'utf-8'))
	const all = { ...pkg.dependencies, ...pkg.devDependencies }
	const range = Object.entries(all).find(([name]) => name.startsWith('@module-federation/'))?.[1]
	if (!range) throw new Error(`${projectDir}: generated package.json has no @module-federation/* dependency`)
	pkg.devDependencies = { ...pkg.devDependencies, '@module-federation/runtime-tools': range }
	fs.writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`)
}

export async function test(options: RunOptions) {
	const dir = path.resolve(options.workspace, 'tooling')
	const pnpm = (cmd: string, cwd = dir) => exec(`pnpm ${cmd}`, { cwd })

	await runFixture({
		...options,
		fixture: 'tooling',
		// Scaffold into the fixture workspace (scaffolded/* is a workspace glob) before overrides
		// and install, then commit so the runner's `git clean` keeps the generated projects.
		beforeInstall: async () => {
			const spec = generatorSpec(options)
			for (const template of TEMPLATES) {
				await pnpm(
					`dlx --config.dlx-cache-max-age=0 --package=${spec} create-module-federation --dir scaffolded/${template} --template ${template} --name ${mfName(template)}`,
				)
				declareRuntimeToolsPeer(path.join(dir, 'scaffolded', template))
			}
			await exec('git add -A', { cwd: dir })
			await exec('git -c user.name=ecosystem-ci -c user.email=ci@localhost commit -qm scaffold', { cwd: dir })
		},
		test: () =>
			runAll('fixture-tooling', ['cli', 'webpack-type', ...TEMPLATES.map((t) => `create:${t}`)], async (item) => {
				if (item === 'cli') {
					const remote = path.join(dir, 'remote')
					await pnpm('run build', remote) // rspack + enhanced, dts disabled
					await pnpm('run dts', remote) // `mf dts` via the enhanced bin -> @module-federation/cli
					await pnpm('run check', remote)
					await pnpm('run test', path.join(dir, 'host')) // standalone `mf dts --generate false` + tsc
				} else if (item === 'webpack-type') {
					await pnpm('run typecheck', path.join(dir, 'webpack-types'))
				} else {
					const template = item.slice('create:'.length)
					await exec(`node scripts/verify-scaffold.mjs scaffolded/${template} ${mfName(template)}`, { cwd: dir })
				}
			}),
	})
}
