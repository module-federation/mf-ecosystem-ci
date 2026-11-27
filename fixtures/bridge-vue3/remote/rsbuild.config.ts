import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';
import { defineConfig } from '@rsbuild/core';
import { pluginVue } from '@rsbuild/plugin-vue';

export default defineConfig({
  server: { port: 4112, strictPort: true },
  output: { assetPrefix: 'http://localhost:4112/' },
  plugins: [
    pluginVue(),
    pluginModuleFederation({
      name: 'remote3',
      exposes: {
        './export-app': './src/export-app.ts',
      },
      shared: ['vue', 'vue-router'],
      dts: false,
    }),
  ],
});
