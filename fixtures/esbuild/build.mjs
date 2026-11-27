// Builds the remote and the host with @module-federation/esbuild, like core's apps/esbuild.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import esbuild from 'esbuild'
import { moduleFederationPlugin } from '@module-federation/esbuild/plugin'

const require = createRequire(import.meta.url)
const shims = require.resolve('es-module-shims')

async function buildProject(name) {
  const outdir = path.join('dist', name)
  fs.rmSync(outdir, { force: true, recursive: true })
  await esbuild.build({
    entryPoints: [path.join(name, 'main.ts')],
    outdir,
    bundle: true,
    platform: 'browser',
    format: 'esm',
    mainFields: ['es2020', 'browser', 'module', 'main'],
    conditions: ['es2022', 'es2015', 'module'],
    resolveExtensions: ['.ts', '.tsx', '.mjs', '.js'],
    loader: { '.ts': 'ts' },
    tsconfig: 'tsconfig.json',
    splitting: true,
    plugins: [moduleFederationPlugin(require(`./${name}/federation.config.cjs`))],
  })
  fs.copyFileSync(path.join(name, 'index.html'), path.join(outdir, 'index.html'))
  // Served locally instead of from a CDN so the run has no third-party network dependency.
  fs.copyFileSync(shims, path.join(outdir, 'es-module-shims.js'))
}

await buildProject('remote')
await buildProject('host')

for (const file of ['dist/remote/remoteEntry.js', 'dist/remote/mf-manifest.json', 'dist/host/main.js']) {
  if (!fs.existsSync(file)) throw new Error(`expected build output ${file} is missing`)
}
console.log('esbuild federation build ok')
