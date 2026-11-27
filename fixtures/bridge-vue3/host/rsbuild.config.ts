import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';
import { defineConfig } from '@rsbuild/core';
import { pluginVue } from '@rsbuild/plugin-vue';

export default defineConfig({
  server: { port: 4111, strictPort: true },
  plugins: [
    pluginVue(),
    pluginModuleFederation({
      name: 'bridge_vue3_host',
      remotes: {
        remote3: 'remote3@http://localhost:4112/mf-manifest.json',
      },
      shared: ['vue', 'vue-router'],
      dts: false,
    }),
  ],
});
