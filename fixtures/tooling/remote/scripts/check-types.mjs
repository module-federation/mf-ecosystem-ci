// Assert what `mf dts` (the @module-federation/cli bin, reached through @module-federation/enhanced)
// wrote next to the rspack build: the types archive with third-party d.ts, and the API types.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import AdmZip from 'adm-zip'

const dist = path.resolve(import.meta.dirname, '../dist')

// The rspack build itself (dts: false) must have produced the container.
assert.ok(fs.existsSync(path.join(dist, 'remoteEntry.js')), 'rspack build produced no remoteEntry.js')

const zipFile = path.join(dist, '@mf-types.zip')
assert.ok(fs.existsSync(zipFile), 'mf dts produced no dist/@mf-types.zip')
const entries = new AdmZip(zipFile).getEntries().map((e) => e.entryName.replaceAll('\\', '/'))
console.log(`@mf-types.zip: ${entries.length} entries`)

const has = (name) => assert.ok(entries.includes(name), `@mf-types.zip has no ${name}\n  entries: ${entries.slice(0, 40).join(', ')}`)
// One entry file per expose, re-exporting the compiled declarations.
has('Button.d.ts')
has('schema.d.ts')
has('compiled-types/Button.d.ts')
has('compiled-types/schema.d.ts')
// @module-federation/third-party-dts-extractor: imports found in the emitted d.ts are resolved
// and their declarations copied under node_modules/ inside the archive.
has('node_modules/zod/package.json')
has('node_modules/zod/index.d.ts')
assert.ok(entries.some((e) => e.startsWith('node_modules/zod/lib/') && e.endsWith('.d.ts')), 'zod lib d.ts not extracted')
// react ships no types, so the extractor must fall back to @types/react.
has('node_modules/@types/react/package.json')
has('node_modules/@types/react/index.d.ts')
has('node_modules/@types/react/jsx-runtime.d.ts')
// Only declarations and package.json are copied, never runtime code.
const runtime = entries.filter((e) => e.startsWith('node_modules/') && /\.(c|m)?js$/.test(e))
assert.deepEqual(runtime, [], 'extractor copied runtime JS into the types archive')
// typescript is always ignored by the extractor.
assert.ok(!entries.some((e) => e.startsWith('node_modules/typescript/')), 'typescript must not be extracted')

const zip = new AdmZip(zipFile)
const buttonDts = zip.readAsText('compiled-types/Button.d.ts')
assert.match(buttonDts, /label: string/)
assert.match(buttonDts, /import\("react\/jsx-runtime"\)\.JSX\.Element/)

// generateAPITypes (on by default in the CLI): typed loadRemote keys, with an alias placeholder
// that the host replaces with its own remote alias when it consumes them.
const apiFile = path.join(dist, '@mf-types.d.ts')
assert.ok(fs.existsSync(apiFile), 'mf dts produced no dist/@mf-types.d.ts')
const api = fs.readFileSync(apiFile, 'utf-8')
for (const key of ["'REMOTE_ALIAS_IDENTIFIER/Button'", "'REMOTE_ALIAS_IDENTIFIER/schema'"]) {
	assert.ok(api.includes(key), `@mf-types.d.ts lacks RemoteKeys ${key}:\n${api}`)
}
console.log('mf dts (generate): archive, extracted third-party types and API types verified')
