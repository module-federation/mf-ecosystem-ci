// The ESM entry points ("import" condition) of both packages, which any ESM consumer gets,
// including the README's library example. Core's own treeshake e2e only loads the CommonJS
// builds. Each check is independent and every failure is reported.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import path from 'node:path'
import { expectSuccess, freshDir, get, postJson, serverEnv, waitForHealth } from './lib.mjs'

const PORT = 4630
const origin = `http://127.0.0.1:${PORT}`

const failures = []
async function check(label, fn) {
	try {
		await fn()
		console.log(`✓ ${label}`)
	} catch (error) {
		console.error(`✗ ${label}\n  ${error?.stack ?? error}`)
		failures.push(label)
	}
}

const { createApp, createLogger, createServer, LocalAdapter } = await import('@module-federation/treeshake-server')
const { createTreeshakeFrontendAdapter } = await import('@module-federation/treeshake-frontend/adapter')

const storeDir = freshDir('.treeshake-esm/store')
const pnpmStore = freshDir('.treeshake-esm/pnpm-store')
const logger = createLogger({ level: 'warn' })
const local = new LocalAdapter()
const deps = await local.create(local.fromEnv({ LOCAL_STORE_DIR: storeDir, LOCAL_STORE_BASE_URL: `${origin}/` }), {
	logger,
})

// Mounted at /explicit with distDir given: isolates the default dist lookup below.
const uiDist = path.resolve(
	path.dirname(createRequire(import.meta.url).resolve('@module-federation/treeshake-frontend/adapter')),
	'..',
)
const frontendAdapters = [createTreeshakeFrontendAdapter({ basePath: '/explicit', distDir: uiDist })]
await check('treeshake-frontend ESM adapter: default distDir resolution', async () => {
	frontendAdapters.push(createTreeshakeFrontendAdapter({ basePath: '/tree-shaking' }))
})

const app = createApp(
	{ objectStore: deps.objectStore, projectPublisher: deps.projectPublisher },
	{
		logger,
		staticRootDir: storeDir,
		pruneIntervalMs: 0,
		runtimeEnv: serverEnv({ npm_config_store_dir: pnpmStore }),
		frontendAdapters,
	},
)
const server = createServer({ app, port: PORT, hostname: '127.0.0.1' })

const servesUi = async (base) => {
	const index = await get(`${origin}${base}/`)
	assert.equal(index.status, 200)
	assert.match(index.body, /<title>Tree Shaking Visualizer<\/title>/)
}

try {
	await waitForHealth(origin)
	await check('treeshake-frontend ESM adapter: serves the UI with explicit distDir', () => servesUi('/explicit'))
	if (frontendAdapters.length > 1) {
		await check('treeshake-frontend ESM adapter: serves the UI with default distDir', () => servesUi('/tree-shaking'))
	}
	await check('treeshake-server ESM build: check-tree-shaking succeeds', async () => {
		const res = await postJson(`${origin}/tree-shaking-shared/build/check-tree-shaking`, {
			shared: [['lodash-es', '4.17.21', ['chunk']]],
			plugins: [],
			target: ['web'],
			libraryType: 'global',
			hostName: 'mf_ecosystem_ci_treeshake_esm',
		})
		const json = expectSuccess('check-tree-shaking (ESM server)', res)
		assert.equal(json.data[0]?.type, 'full')
		assert.equal((await get(json.data[0].cdnUrl)).status, 200)
	})
} finally {
	await new Promise((resolve) => {
		server.close(() => resolve(null))
		server.closeAllConnections?.()
	})
}

if (failures.length) {
	console.error(`\nESM entry points: ${failures.length} failed: ${failures.join('; ')}`)
	process.exit(1)
}
console.log('ESM entry points: all assertions passed')
process.exit(0)
