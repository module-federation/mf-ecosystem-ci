import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';

// React 19 remote served on :4221. The playground reads its manifest's shared React
// version to decide how to inject React into the sandbox preview.
export default defineConfig({
  source: { entry: { index: './src/index.js' } },
  output: { assetPrefix: 'http://127.0.0.1:4221/', minify: false },
  plugins: [
    pluginReact(),
    pluginModuleFederation({
      name: 'dt_remote',
      filename: 'remoteEntry.js',
      exposes: { './Card': './src/Card.jsx' },
      shared: {
        react: { singleton: true, requiredVersion: '^19.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
      },
      dts: false,
    }),
  ],
});
