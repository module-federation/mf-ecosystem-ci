import path from 'node:path'
import { defineConfig } from '@rspack/cli'
import { ModuleFederationPlugin } from '@module-federation/enhanced/rspack'
import mfConfig from './module-federation.config.ts'

export default defineConfig({
	mode: 'production',
	context: import.meta.dirname,
	entry: './src/index.ts',
	output: {
		path: path.resolve(import.meta.dirname, 'dist'),
		publicPath: 'auto',
		uniqueName: 'tooling_remote',
	},
	resolve: { extensions: ['.ts', '.tsx', '.js'] },
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				loader: 'builtin:swc-loader',
				options: {
					jsc: {
						parser: { syntax: 'typescript', tsx: true },
						transform: { react: { runtime: 'automatic' } },
					},
				},
			},
		],
	},
	// Types come from `mf dts` (the CLI under test), not from the build plugin.
	plugins: [new ModuleFederationPlugin({ ...mfConfig, dts: false })],
})
