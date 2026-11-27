import { installPlaywright, runFixture } from '../../utils.ts'
import type { RunOptions } from '../../types.d.ts'

/** @module-federation/esbuild: host + remote built with esbuild, rendered in Chromium. */
export const covers = ['@module-federation/esbuild']

export async function test(options: RunOptions) {
	await runFixture({
		...options,
		fixture: 'esbuild',
		build: 'build',
		beforeTest: installPlaywright,
		test: 'test',
	})
}
