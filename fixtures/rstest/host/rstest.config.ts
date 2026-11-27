import path from 'node:path'
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin'
import { federation } from '@module-federation/rstest'
import { pluginReact } from '@rsbuild/plugin-react'
import { defineConfig } from '@rstest/core'
import federationOptions from './module-federation.config'

const dir = import.meta.dirname

export default defineConfig({
  globalSetup: [path.resolve(dir, 'remote-server.mjs')],
  include: [path.resolve(dir, 'tests/*.test.ts'), path.resolve(dir, 'tests/*.test.tsx')],
  testEnvironment: 'jsdom',
  testTimeout: 30_000,
  plugins: [
    pluginReact(),
    pluginModuleFederation(federationOptions, { environment: 'rstest', target: 'node' }),
    federation(),
  ],
})
