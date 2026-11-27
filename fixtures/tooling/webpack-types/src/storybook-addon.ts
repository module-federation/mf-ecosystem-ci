// Mirrors packages/storybook-addon/src/lib/storybook-addon.ts, which compiles against
// @module-federation/webpack-type through the `webpack` path alias.
import { container, type Configuration, type WebpackPluginInstance } from 'webpack'
import type { moduleFederationPlugin } from '@module-federation/sdk'

const { ModuleFederationPlugin } = container

export function withFederation(
	webpackConfig: Configuration,
	moduleFederationConfig: moduleFederationPlugin.ModuleFederationPluginOptions,
): Configuration {
	const plugins: WebpackPluginInstance[] = (webpackConfig.plugins ?? []).filter(
		(p): p is WebpackPluginInstance => !!p && typeof p === 'object',
	)
	plugins.push(
		new ModuleFederationPlugin({
			name: moduleFederationConfig.name,
			filename: 'remoteEntry.js',
			exposes: { './Button': './src/Button' },
			shared: { react: { singleton: true, requiredVersion: '^18.0.0' } },
		}),
	)
	return {
		...webpackConfig,
		experiments: { outputModule: false },
		optimization: { runtimeChunk: false },
		output: { publicPath: 'auto' },
		plugins,
	}
}

// The types are real, not `any`: invalid options must be rejected.
// @ts-expect-error mode is 'development' | 'production' | 'none'
export const badMode: Configuration = { mode: 'staging' }
// @ts-expect-error ModuleFederationPlugin requires an options object
export const badPlugin = new ModuleFederationPlugin()
