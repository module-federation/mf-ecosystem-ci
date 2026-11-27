// Deep `webpack/lib/*` type imports, as core uses them (packages/manifest/src/StatsManager.ts,
// packages/enhanced/test/unit/sharing/*, the paths in packages/sdk/src/normalize-webpack-path.ts).
// They resolve to the package's lib/*.d.ts files through the `webpack/*` alias.
import type { StatsModule, StatsCompilation } from 'webpack/lib/stats/DefaultStatsFactoryPlugin'
import type { SemVerRange } from 'webpack/lib/sharing/semver'
import type AsyncDependenciesBlock from 'webpack/lib/graph/AsyncDependenciesBlock'
import type Dependency from 'webpack/lib/graph/Dependency'
import type Module from 'webpack/lib/module/Module'
import type { Compiler, Compilation } from 'webpack'

export function federatedModuleNames(stats: StatsCompilation): string[] {
	return (stats.modules ?? [])
		.filter((m: StatsModule) => m.moduleType === 'provide-module' || m.moduleType === 'remote-module')
		.map((m: StatsModule) => String(m.name))
}

export const range: SemVerRange = [1, 18, 0]

export function blockDependencies(block: AsyncDependenciesBlock): Dependency[] {
	return block.dependencies
}

export function moduleId(compilation: Compilation, module: Module): string | number | null {
	return compilation.chunkGraph.getModuleId(module)
}

export class FederationProbePlugin {
	apply(compiler: Compiler) {
		compiler.hooks.thisCompilation.tap('FederationProbePlugin', (compilation) => {
			compilation.hooks.processAssets.tap(
				{ name: 'FederationProbePlugin', stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT },
				(assets) => {
					void Object.keys(assets)
				},
			)
		})
	}
}

// None of these may have degraded to `any` (an unused @ts-expect-error fails the build).
// @ts-expect-error SemVerRange is an array
export const badRange: SemVerRange = '^18.0.0'
// @ts-expect-error StatsModule.moduleType is a string
export const badStats: StatsModule = { moduleType: 1 }
// @ts-expect-error a number is not a Dependency
export const badDependency: Dependency = 1
// @ts-expect-error a number is not a Module
export const badModule: Module = 1
// @ts-expect-error the compiler has no such hook
export const badHook = (compiler: Compiler) => compiler.hooks.notAHook
