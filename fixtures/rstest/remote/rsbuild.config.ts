import { createModuleFederationConfig, pluginModuleFederation } from '@module-federation/rsbuild-plugin'
import { defineConfig } from '@rsbuild/core'
import { pluginReact } from '@rsbuild/plugin-react'

// Two node remotes, like core's rstest-federation-remote / -profile-remote:
// `http` is served over HTTP during the test run, `local` is loaded from disk as `commonjs <path>`.
const HTTP_ORIGIN = 'http://127.0.0.1:4420/'

const shared = { react: { singleton: true }, 'react-dom': { singleton: true } }

const httpRemote = createModuleFederationConfig({
  name: 'rstest_fixture_catalog',
  filename: 'remoteEntry.cjs',
  exposes: {
    './ProductPanel': './src/ProductPanel.tsx',
    './product-details': './src/product-details.ts',
  },
  shared,
  dts: false,
  manifest: false,
  dev: false,
})

const localRemote = createModuleFederationConfig({
  name: 'rstest_fixture_profile',
  filename: 'remoteEntry.cjs',
  exposes: {
    './ProfileCard': './src/ProfileCard.tsx',
  },
  shared,
  dts: false,
  manifest: false,
  dev: false,
})

const entry = { index: './src/index.ts' }

export default defineConfig({
  mode: 'development',
  environments: {
    http: {
      source: { entry },
      output: {
        assetPrefix: HTTP_ORIGIN,
        cleanDistPath: true,
        distPath: { root: 'dist/http' },
        filenameHash: false,
        target: 'node',
      },
    },
    local: {
      source: { entry },
      output: {
        cleanDistPath: true,
        distPath: { root: 'dist/local' },
        target: 'node',
      },
    },
  },
  plugins: [
    pluginReact({ fastRefresh: false }),
    pluginModuleFederation(httpRemote, { environment: 'http', target: 'node' }),
    pluginModuleFederation(localRemote, { environment: 'local', target: 'node' }),
  ],
})
