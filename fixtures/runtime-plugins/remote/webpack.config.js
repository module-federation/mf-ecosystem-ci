const path = require('path');
const { ModuleFederationPlugin } = require('@module-federation/enhanced/webpack');

/**
 * Pure provider. `experiments.externalRuntime` externalizes
 * `@module-federation/runtime-core` to the `_FEDERATION_RUNTIME_CORE` global, so
 * this remote only works when the consumer injects the runtime core.
 */
module.exports = {
  mode: 'production',
  target: 'web',
  context: __dirname,
  entry: {},
  devtool: false,
  output: {
    path: path.resolve(__dirname, 'dist'),
    publicPath: 'auto',
    uniqueName: 'rp_remote',
    clean: true,
  },
  optimization: { minimize: false, moduleIds: 'named' },
  plugins: [
    new ModuleFederationPlugin({
      name: 'rp_remote',
      filename: 'remoteEntry.js',
      exposes: { './greeting': './src/greeting.js' },
      dts: false,
      experiments: { externalRuntime: true },
    }),
  ],
};
