import { runFixture } from '../../utils.ts'
import type { RunOptions } from '../../types.d.ts'

/**
 * @module-federation/rstest: rstest (node + jsdom) imports components and functions from an
 * HTTP-served remote and a local CommonJS remote; the suite passes only if rstest passes.
 */
export const covers = ['@module-federation/rstest']

export async function test(options: RunOptions) {
	await runFixture({
		...options,
		fixture: 'rstest',
		build: 'build',
		test: 'test',
	})
}
