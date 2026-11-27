import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

export default defineConfig({
  server: { port: 4101, strictPort: true },
  plugins: [
    pluginReact(),
    pluginModuleFederation({
      name: 'bridge_react_host',
      remotes: {
        remote1: 'remote1@http://localhost:4102/mf-manifest.json',
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true },
      },
      dts: false,
    }),
  ],
});
