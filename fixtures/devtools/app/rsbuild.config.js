import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

export default defineConfig({
  source: {
    entry: {
      // Embeds the devtools panel (`@module-federation/devtools`) next to a live MF runtime.
      devtools: './src/devtools.jsx',
      // Embeds `ModuleFederationPlayground` pointed at the local remote.
      playground: './src/playground.jsx',
      // Classic script that exposes the MF runtime as `window.ModuleFederationRuntime`;
      // the playground sandbox loads it from `runtimeModuleUrl` instead of esm.sh.
      'mf-runtime': './src/mf-runtime.js',
    },
  },
  output: {
    filenameHash: false,
    minify: false,
  },
  html: { template: './src/index.html' },
  performance: { chunkSplit: { strategy: 'all-in-one' } },
  tools: {
    rspack: (config) => {
      // The playground bundles the TypeScript compiler, which has a dynamic require.
      config.ignoreWarnings = [...(config.ignoreWarnings || []), /Critical dependency/];
    },
  },
  plugins: [pluginReact()],
});
