const path = require('path');
const { ModuleFederationPlugin } = require('@module-federation/enhanced/webpack');
const { ObservabilityBuildPlugin } = require('@module-federation/observability-plugin/build');

// Port 4212 is a "primary CDN" that always answers 503; 4211 is the healthy mirror.
// The retry plugin has to rotate to the mirror for both the manifest and remoteEntry.
const moduleFederation = {
  name: 'rp_host',
  remotes: {
    rp_remote: 'rp_remote@http://127.0.0.1:4212/mf-manifest.json',
  },
  runtimePlugins: [
    path.resolve(__dirname, 'src/retry-runtime-plugin.js'),
    path.resolve(__dirname, 'src/observability-runtime-plugin.js'),
  ],
  dts: false,
  // Pure consumer: enhanced appends @module-federation/inject-external-runtime-core-plugin,
  // which publishes this host's runtime core on `_FEDERATION_RUNTIME_CORE`.
  experiments: { provideExternalRuntime: true },
};

module.exports = {
  mode: 'production',
  target: 'web',
  context: __dirname,
  entry: { main: './src/index.js' },
  devtool: false,
  output: {
    path: path.resolve(__dirname, 'dist'),
    publicPath: 'auto',
    uniqueName: 'rp_host',
    clean: true,
  },
  optimization: { minimize: false, moduleIds: 'named' },
  plugins: [
    new ModuleFederationPlugin(moduleFederation),
    new ObservabilityBuildPlugin({ moduleFederation }),
  ],
};
