// Assert on the static output: the provider emitted federation entries for browser and SSG,
// and the consumer's SSG HTML, search index and llms output contain the federated fragment.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const TOKEN = 'mfprovidersearchtoken'
const FRAGMENT = 'Federated fragment from docs_provider rendered for docs_consumer'
const read = (file) => fs.readFileSync(file, 'utf-8')
const text = (html) =>
  html
    .replace(/<!--.*?-->/gs, '')
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')

// Provider: remote entry + manifest for the browser, and a node remote entry for SSG consumers.
const provider = 'provider/doc_build'
for (const file of ['remoteEntry.js', 'mf-manifest.json', 'mf-ssg/remoteEntry.js']) {
  assert.ok(fs.existsSync(path.join(provider, file)), `provider is missing ${file}`)
}
const manifest = JSON.parse(read(path.join(provider, 'mf-manifest.json')))
assert.equal(manifest.name, 'docs_provider')
assert.deepEqual(
  manifest.exposes.map((e) => e.path),
  ['./guide'],
  'provider manifest exposes ./guide',
)
// target 'dual': the manifest also advertises a CommonJS remote entry for SSG (node) consumers.
assert.deepEqual(
  { name: manifest.metaData.ssrRemoteEntry?.name, type: manifest.metaData.ssrRemoteEntry?.type },
  { name: 'remoteEntry.js', type: 'commonjs-module' },
  'manifest advertises an SSR remote entry',
)
const autoShared = manifest.shared.map((s) => s.name)
for (const name of ['react', 'react-dom', '@mdx-js/react']) {
  assert.ok(autoShared.includes(name), `autoShared should share ${name}, got ${autoShared.join(', ')}`)
}

// Consumer: SSG HTML includes the remote fragment, rendered with the consumer's props.
const consumer = 'consumer/doc_build'
const home = text(read(path.join(consumer, 'index.html')))
assert.ok(home.includes('Consumer home'), 'consumer page title rendered')
assert.ok(home.includes(FRAGMENT), `SSG HTML lacks the federated fragment:\n${home.slice(0, 2000)}`)
assert.ok(home.includes(TOKEN), 'SSG HTML lacks the fragment token')

// rebuildSearchIndex: the local search index is regenerated from HTML, so the fragment is searchable.
const staticDir = path.join(consumer, 'static')
const indexes = fs.readdirSync(staticDir).filter((f) => /^search_index.*\.json$/.test(f))
assert.ok(indexes.length > 0, 'no search index emitted')
assert.ok(
  indexes.some((f) => read(path.join(staticDir, f)).includes(TOKEN)),
  `search index (${indexes.join(', ')}) lacks the federated fragment`,
)

// rebuildLlms: llms-full.txt is regenerated from HTML and contains the fragment content.
const llmsFull = read(path.join(consumer, 'llms-full.txt'))
assert.ok(llmsFull.includes(TOKEN), `llms-full.txt lacks the federated fragment:\n${llmsFull.slice(0, 2000)}`)

console.log('rspress federated SSG output ok')
