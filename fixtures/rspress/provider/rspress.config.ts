import * as path from 'node:path'
import { defineConfig } from '@rspress/core'
import { pluginModuleFederation } from '@module-federation/rspress-plugin'

// Exposes a docs fragment as a remote. SSG needs an absolute public path for the node build.
const origin = 'http://localhost:4410'

export default defineConfig({
  root: path.join(__dirname, 'docs'),
  title: 'MF provider docs',
  lang: 'en',
  plugins: [
    pluginModuleFederation({
      name: 'docs_provider',
      filename: 'remoteEntry.js',
      shareStrategy: 'loaded-first',
      getPublicPath: `return typeof window === 'undefined' ? '${origin}/mf-ssg/' : '${origin}/';`,
      exposes: {
        './guide': path.join(__dirname, 'docs/guide.mdx'),
      },
    }),
  ],
  builderConfig: {
    output: { assetPrefix: '/' },
    environments: {
      node: { output: { assetPrefix: `${origin}/` } },
    },
    performance: { buildCache: false },
  },
})
