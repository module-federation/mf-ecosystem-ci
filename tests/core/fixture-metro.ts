import { runFixture } from '../../utils.ts'
import type { RunOptions } from '../../types.d.ts'

/**
 * @module-federation/metro and its CLI plugins: a React Native host and remote bundled
 * for Android through each CLI integration (react-native community CLI, Rock, RNEF).
 * No device is involved; the contract checked is the federated output (container,
 * exposed and shared bundles, mf-manifest.json, host bundle wired to the remote).
 */
export const covers = [
	'@module-federation/metro',
	'@module-federation/metro-plugin-rnc-cli',
	'@module-federation/metro-plugin-rnef',
	'@module-federation/metro-plugin-rock',
]

export async function test(options: RunOptions) {
	await runFixture({
		...options,
		fixture: 'metro',
		build: 'build',
		test: 'test',
	})
}
