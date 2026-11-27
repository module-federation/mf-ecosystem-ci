import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

export default defineConfig({
  server: { port: 4102, strictPort: true },
  output: { assetPrefix: 'http://localhost:4102/' },
  plugins: [
    pluginReact(),
    pluginModuleFederation({
      name: 'remote1',
      exposes: {
        './export-app': './src/export-app.tsx',
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true },
      },
      dts: false,
    }),
  ],
});
