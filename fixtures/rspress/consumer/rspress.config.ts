import * as path from 'node:path'
import { defineConfig } from '@rspress/core'
import { pluginModuleFederation } from '@module-federation/rspress-plugin'

// Consumes the provider's docs fragment; SSG renders it and the plugin rebuilds
// the search index and llms output from the generated HTML.
export default defineConfig({
  root: path.join(__dirname, 'docs'),
  title: 'MF consumer docs',
  lang: 'en',
  llms: true,
  plugins: [
    pluginModuleFederation({
      name: 'docs_consumer',
      shareStrategy: 'loaded-first',
      remotes: {
        docs_provider: 'docs_provider@http://localhost:4410/mf-manifest.json',
      },
    }),
  ],
  builderConfig: {
    performance: { buildCache: false },
  },
})
