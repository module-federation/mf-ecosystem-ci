const path = require('node:path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const {withModuleFederation} = require('@module-federation/metro');

const config = {
  resolver: {
    extraNodeModules: {
      '@babel/runtime': path.resolve(__dirname, 'node_modules/@babel/runtime'),
    },
    useWatchman: false,
  },
  // pnpm keeps real package files in the workspace root's node_modules/.pnpm
  watchFolders: [path.resolve(__dirname, '../node_modules')],
};

module.exports = withModuleFederation(
  mergeConfig(getDefaultConfig(__dirname), config),
  {
    name: 'host',
    remotes: {
      // Never fetched: the suite only bundles. Port is inside the suite's 4300-4399 range.
      mini: 'mini@http://localhost:4300/mf-manifest.json',
    },
    shared: {
      react: {
        singleton: true,
        eager: true,
        requiredVersion: '19.1.0',
        version: '19.1.0',
      },
      'react-native': {
        singleton: true,
        eager: true,
        requiredVersion: '0.80.0',
        version: '0.80.0',
      },
      lodash: {
        singleton: false,
        eager: false,
        requiredVersion: '4.18.1',
        version: '4.18.1',
      },
    },
    shareStrategy: 'loaded-first',
    runtimePlugins: [path.resolve(__dirname, './runtime-plugin.ts')],
  },
  {
    flags: {
      unstable_patchHMRClient: true,
      unstable_patchInitializeCore: true,
      unstable_patchRuntimeRequire: true,
    },
  },
);
