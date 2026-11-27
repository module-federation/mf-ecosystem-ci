import { installPlaywright, runFixture } from '../../utils.ts'
import type { RunOptions } from '../../types.d.ts'

/**
 * @module-federation/bridge-vue3 through an rsbuild host + remote (Vue 3, vue-router 4),
 * modelled on core's apps/router-demo vue3 host and remote3. Playwright checks render,
 * props, basename routing, host-to-remote route sync, memoryRoute, and the host calls
 * @module-federation/bridge-shared's dispatchPopstateEnv directly.
 */
export const covers = ['@module-federation/bridge-vue3', '@module-federation/bridge-shared']

export async function test(options: RunOptions) {
	await runFixture({
		...options,
		fixture: 'bridge-vue3',
		build: 'build',
		beforeTest: () => installPlaywright(),
		test: 'test:e2e',
	})
}
