// @module-federation/treeshake-server, started through its published `treeshake-server` bin
// (local filesystem storage, embedded UI), driven over HTTP the way the treeshake UI and
// build plugins call it: a full build, a tree-shaken re-shake build, then a cache hit.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import {
	expectSuccess,
	fixtureDir,
	freshDir,
	get,
	listFiles,
	postJson,
	serverEnv,
	waitForHealth,
} from './lib.mjs'

const PORT = 4610
const origin = `http://127.0.0.1:${PORT}`
const api = `${origin}/tree-shaking-shared`
const storeDir = freshDir('.treeshake-cli/store')
const pnpmStore = freshDir('.treeshake-cli/pnpm-store')

// Small, side-effect-free ESM package: one used export out of ~300.
const SHARED = ['lodash-es', '4.17.21']
const USED = 'chunk'
const payload = (usedExports) => ({
	shared: [[...SHARED, usedExports]],
	plugins: [],
	target: ['web'],
	libraryType: 'global',
	hostName: 'mf_ecosystem_ci_treeshake',
})

const bin = path.join(fixtureDir, 'node_modules', '.bin', 'treeshake-server')
assert.ok(fs.existsSync(bin), `published bin missing: ${bin}`)

const server = spawn(bin, [], {
	cwd: fixtureDir,
	detached: true, // own process group, so teardown also reaps pnpm/rspack children
	stdio: ['ignore', 'inherit', 'inherit'],
	env: serverEnv({
		PORT: String(PORT),
		HOST: '127.0.0.1',
		LOCAL_STORE_DIR: storeDir,
		LOCAL_STORE_BASE_URL: `${origin}/`,
		PNPM_PRUNE_INTERVAL_MS: '0',
		LOG_LEVEL: 'warn',
		npm_config_store_dir: pnpmStore,
		TREESHAKE_FRONTEND_DIST: '',
	}),
})
const exited = new Promise((resolve) => server.once('exit', (code, signal) => resolve({ code, signal })))

async function stop() {
	if (server.exitCode != null || server.signalCode != null) return
	try {
		process.kill(-server.pid, 'SIGTERM')
	} catch {}
	const timer = setTimeout(() => {
		try {
			process.kill(-server.pid, 'SIGKILL')
		} catch {}
	}, 5000)
	await exited
	clearTimeout(timer)
}

async function main() {
	const health = await Promise.race([
		waitForHealth(origin),
		exited.then(({ code, signal }) => {
			throw new Error(`treeshake-server exited early (code ${code}, signal ${signal})`)
		}),
	])
	assert.equal(health.status, 'ok')
	console.log('✓ bin started, /tree-shaking-shared/healthz ok')

	// The CLI embeds the treeshake UI from its own package.
	const ui = await get(`${origin}/tree-shaking/`)
	assert.equal(ui.status, 200)
	assert.match(ui.type, /text\/html/)
	assert.match(ui.body, /<title>Tree Shaking Visualizer<\/title>/)
	const script = ui.body.match(/src="(\/tree-shaking\/static\/js\/index\.[^"]+\.js)"/)?.[1]
	assert.ok(script, 'embedded UI html references its entry script')
	const entry = await get(`${origin}${script}`)
	assert.equal(entry.status, 200)
	assert.match(entry.type, /javascript/)
	console.log('✓ embedded UI served at /tree-shaking/')

	// Request validation (zod) rejects malformed configs before any build work.
	const invalid = await postJson(`${api}/build`, { shared: 'lodash-es' })
	assert.equal(invalid.status, 400, `invalid payload should be rejected, got ${invalid.status}`)
	console.log('✓ malformed build request rejected with 400')

	// 1. Full build: what the UI calls first to learn whether the package can be tree-shaken.
	const full = expectSuccess('check-tree-shaking', await postJson(`${api}/build/check-tree-shaking`, payload([USED])))
	assert.equal(full.data.length, 1, JSON.stringify(full))
	const fullItem = full.data[0]
	console.log('full build result:', JSON.stringify({ ...fullItem, modules: fullItem.modules?.length }))
	assert.equal(fullItem.name, SHARED[0])
	assert.equal(fullItem.version, SHARED[1])
	assert.equal(fullItem.type, 'full')
	assert.equal(fullItem.canTreeShaking, true, 'lodash-es is pure ESM and must be tree-shakeable')
	assert.ok(Array.isArray(fullItem.modules) && fullItem.modules.includes(USED), 'full report lists the provided exports')
	assert.ok(fullItem.modules.length > 100, `lodash-es provides hundreds of exports, got ${fullItem.modules.length}`)
	assert.ok(fullItem.globalName, 'full result has a global name')
	assert.ok(fullItem.cdnUrl.startsWith(`${api}/`), `artifact served by local storage: ${fullItem.cdnUrl}`)
	const fullJs = await get(fullItem.cdnUrl)
	assert.equal(fullJs.status, 200)
	assert.match(fullJs.type, /javascript/)
	const fullMeta = await get(fullItem.cdnUrl.replace(/\.js$/, '.json'))
	assert.equal(fullMeta.status, 200)
	assert.equal(JSON.parse(fullMeta.body).canTreeShaking, true)
	console.log(`✓ full build uploaded: ${fullJs.body.length} bytes`)

	// 2. Re-shake: only the used export survives.
	const shaken = expectSuccess('build', await postJson(`${api}/build`, payload([USED])))
	assert.equal(shaken.data.length, 1, JSON.stringify(shaken))
	assert.deepEqual(shaken.cached, [])
	const shakenItem = shaken.data[0]
	console.log('re-shake result:', JSON.stringify(shakenItem))
	assert.equal(shakenItem.type, 're-shake')
	assert.equal(shakenItem.name, SHARED[0])
	assert.equal(shakenItem.globalName, fullItem.globalName)
	assert.notEqual(shakenItem.cdnUrl, fullItem.cdnUrl)
	const shakenJs = await get(shakenItem.cdnUrl)
	assert.equal(shakenJs.status, 200)
	assert.match(shakenJs.type, /javascript/)
	console.log(`✓ re-shake build uploaded: ${shakenJs.body.length} bytes (full ${fullJs.body.length})`)
	assert.ok(
		shakenJs.body.length * 4 < fullJs.body.length,
		`tree-shaken bundle (${shakenJs.body.length}) should be far smaller than full (${fullJs.body.length})`,
	)

	// 3. Same request again: served from the object store without rebuilding.
	const cached = expectSuccess('cached build', await postJson(`${api}/build`, payload([USED])))
	assert.equal(cached.cached.length, 1, JSON.stringify(cached))
	assert.equal(cached.data.length, 1)
	assert.equal(cached.data[0].cdnUrl, shakenItem.cdnUrl)
	console.log('✓ repeated build answered from cache')

	const stored = listFiles(storeDir)
	console.log('local store:', stored)
	for (const url of [fullItem.cdnUrl, shakenItem.cdnUrl]) {
		const rel = new URL(url).pathname.replace(/^\//, '')
		assert.ok(stored.includes(rel), `artifact persisted in LOCAL_STORE_DIR: ${rel}`)
	}
	console.log('✓ artifacts persisted in LOCAL_STORE_DIR')
}

try {
	await main()
	console.log('treeshake-server CLI: all assertions passed')
} finally {
	await stop()
}
