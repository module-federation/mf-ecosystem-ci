import { installPlaywright, runFixture } from '../../utils.ts'
import type { RunOptions } from '../../types.d.ts'

/**
 * Runtime plugins in a real webpack host/remote pair (fixtures/runtime-plugins):
 * the retry plugin rotates a dead CDN to a mirror for the manifest and remoteEntry,
 * the observability plugin records the load, and `experiments.provideExternalRuntime`
 * injects the host's runtime core into a remote built with `externalRuntime`.
 */
export const covers = [
	'@module-federation/retry-plugin',
	'@module-federation/observability-plugin',
	'@module-federation/inject-external-runtime-core-plugin',
]

export async function test(options: RunOptions) {
	await runFixture({
		...options,
		fixture: 'runtime-plugins',
		build: 'build',
		beforeTest: installPlaywright,
		test: 'test',
	})
}
