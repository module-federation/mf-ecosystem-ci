import path from 'node:path'
import { createModuleFederationConfig } from '@module-federation/rsbuild-plugin'

const localRemoteEntry = path.resolve(import.meta.dirname, '../remote/dist/local/remoteEntry.cjs')

export default createModuleFederationConfig({
  name: 'rstest_fixture_host',
  remotes: {
    catalog: 'rstest_fixture_catalog@http://127.0.0.1:4420/remoteEntry.cjs',
    profile: `commonjs ${localRemoteEntry}`,
  },
  shared: {
    react: { singleton: true },
    'react-dom': { singleton: true },
  },
  dts: false,
  manifest: false,
  dev: false,
})
