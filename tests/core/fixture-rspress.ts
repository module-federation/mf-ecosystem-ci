import { installPlaywright, runFixture } from '../../utils.ts'
import type { RunOptions } from '../../types.d.ts'

/**
 * @module-federation/rspress-plugin: a provider docs site exposes an MDX fragment, a consumer
 * site renders it during SSG, and the plugin rebuilds search/llms output from the HTML.
 */
export const covers = ['@module-federation/rspress-plugin']

export async function test(options: RunOptions) {
	await runFixture({
		...options,
		fixture: 'rspress',
		build: 'build',
		beforeTest: installPlaywright,
		test: ['check', 'e2e'],
	})
}
