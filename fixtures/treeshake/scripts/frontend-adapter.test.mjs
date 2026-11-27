// @module-federation/treeshake-frontend/adapter mounted on @module-federation/treeshake-server's
// library API, loaded the way core's own treeshake e2e server does it
// (packages/treeshake-frontend/scripts/e2e-server.js, CommonJS require). HTTP checks on the
// adapter, then the UI's analyze flow in Chromium against the real build service.
// The ESM entry points are exercised separately in esm-entrypoints.test.mjs.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { chromium } from '@playwright/test'
import { freshDir, get, serverEnv, waitForHealth } from './lib.mjs'

const require = createRequire(import.meta.url)
const { createApp, createLogger, createServer, LocalAdapter } = require('@module-federation/treeshake-server')
const { createTreeshakeFrontendAdapter } = require('@module-federation/treeshake-frontend/adapter')

const PORT = 4620
const origin = `http://127.0.0.1:${PORT}`
const api = `${origin}/tree-shaking-shared`

const storeDir = freshDir('.treeshake-lib/store')
const pnpmStore = freshDir('.treeshake-lib/pnpm-store')

const logger = createLogger({ level: 'warn' })
const local = new LocalAdapter()
const deps = await local.create(
	local.fromEnv({ LOCAL_STORE_DIR: storeDir, LOCAL_STORE_BASE_URL: `${origin}/` }),
	{ logger },
)

// No distDir: the adapter must find the UI bundle inside its own published package.
const ui = createTreeshakeFrontendAdapter({ basePath: '/tree-shaking' })
const strict = createTreeshakeFrontendAdapter({ basePath: '/ui-strict/', spaFallback: false })
assert.equal(ui.id, 'treeshake-frontend')

const app = createApp(
	{ objectStore: deps.objectStore, projectPublisher: deps.projectPublisher },
	{
		logger,
		// Serve /tree-shaking-shared/* artifacts from the directory the local adapter writes to.
		staticRootDir: storeDir,
		pruneIntervalMs: 0,
		runtimeEnv: serverEnv({ npm_config_store_dir: pnpmStore }),
		frontendAdapters: [ui, strict],
	},
)
const server = createServer({ app, port: PORT, hostname: '127.0.0.1' })

async function stop() {
	await new Promise((resolve) => {
		server.close(() => resolve(null))
		server.closeAllConnections?.()
	})
}

async function checkAdapterRoutes() {
	const index = await get(`${origin}/tree-shaking`)
	assert.equal(index.status, 200)
	assert.match(index.type, /^text\/html/)
	assert.match(index.body, /<title>Tree Shaking Visualizer<\/title>/)

	const assets = [...index.body.matchAll(/(?:src|href)="(\/tree-shaking\/static\/[^"]+)"/g)].map((m) => m[1])
	assert.ok(assets.some((a) => a.endsWith('.js')) && assets.some((a) => a.endsWith('.css')), `assets: ${assets}`)
	for (const asset of assets) {
		const res = await get(`${origin}${asset}`)
		assert.equal(res.status, 200, asset)
		assert.match(res.type, asset.endsWith('.css') ? /^text\/css/ : /^application\/javascript/, asset)
	}
	const icon = await fetch(`${origin}/tree-shaking/favicon.ico`)
	assert.equal(icon.status, 200)
	assert.equal(icon.headers.get('content-type'), 'image/x-icon')

	// Client-side routes fall back to index.html.
	const deep = await get(`${origin}/tree-shaking/analyze/some/route`)
	assert.equal(deep.status, 200)
	assert.equal(deep.body, index.body)

	// Traversal out of the dist directory never serves files from outside it.
	const traversal = await get(`${origin}/tree-shaking/..%2f..%2fpackage.json`)
	assert.ok(!traversal.body.includes('"@module-federation/treeshake-frontend"'), 'path traversal leaked package.json')

	// spaFallback: false answers 404 for unknown paths but still serves real files.
	const strictIndex = await get(`${origin}/ui-strict`)
	assert.equal(strictIndex.status, 200)
	assert.equal(strictIndex.body, index.body)
	assert.equal((await get(`${origin}/ui-strict/missing/route`)).status, 404)
	assert.equal((await get(`${origin}/ui-strict${assets[0].slice('/tree-shaking'.length)}`)).status, 200)

	// The API routes of the server are untouched by the adapter.
	assert.equal((await get(`${origin}/tree-shaking-shared/healthz`)).status, 200)
	console.log(`✓ adapter serves index, ${assets.length} assets, SPA fallback, strict mode, traversal guard`)
}

async function runAnalyzeFlow() {
	const browser = await chromium.launch()
	try {
		const page = await browser.newPage()
		const pageErrors = []
		const consoleErrors = []
		page.on('pageerror', (error) => pageErrors.push(error))
		page.on('console', (msg) => msg.type() === 'error' && consoleErrors.push(msg.text()))
		page.on('requestfailed', (req) => consoleErrors.push(`request failed: ${req.url()} ${req.failure()?.errorText}`))
		await page.addInitScript((serverUrl) => {
			window.localStorage.setItem('treeshake_server_url', serverUrl)
		}, api)

		await page.goto(`${origin}/tree-shaking/`)
		await page.waitForLoadState('networkidle')
		await page.getByRole('button', { name: /try it now/i }).click()
		await page.waitForURL(/tree-shaking\/#\/analyze/)

		const isPost = (suffix) => (resp) =>
			resp.request().method() === 'POST' && new URL(resp.url()).pathname.endsWith(suffix)

		// The UI defaults to Chinese, so buttons match either language (as core's e2e does).
		// "Fill demo data" asks the server for a full build of antd to list its exports.
		const [checkResp] = await Promise.all([
			page.waitForResponse(isPost('/tree-shaking-shared/build/check-tree-shaking'), { timeout: 300_000 }),
			page.getByRole('button', { name: /fill demo data|填入演示数据/i }).click(),
		])
		const check = await checkResp.json()
		assert.equal(check.status, 'success', JSON.stringify(check).slice(0, 4000))
		const antdFull = check.data.find((d) => d.name === 'antd')
		assert.ok(antdFull, 'check-tree-shaking returns antd')
		assert.equal(antdFull.type, 'full')
		assert.equal(antdFull.canTreeShaking, true)
		assert.ok(antdFull.modules.includes('Button'), 'antd full build reports the Button export')
		console.log(`✓ UI check-tree-shaking: antd full build, ${antdFull.modules.length} exports`)

		// "Analyze" requests the re-shake build and renders a full-vs-treeshake comparison.
		const [buildResp] = await Promise.all([
			page.waitForResponse(isPost('/tree-shaking-shared/build'), { timeout: 300_000 }),
			page.getByRole('button', { name: /analyze treeshake savings|立即分析/i }).click(),
		])
		const build = await buildResp.json()
		assert.equal(build.status, 'success', JSON.stringify(build).slice(0, 4000))
		const antdShaken = build.data.find((d) => d.name === 'antd')
		assert.ok(antdShaken, 'build returns antd')
		assert.equal(antdShaken.type, 're-shake')
		console.log(`✓ UI build: antd re-shake at ${antdShaken.cdnUrl}`)

		const results = page.locator('#results')
		try {
			await results.waitFor({ state: 'visible', timeout: 120_000 })
		} catch (error) {
			const body = await page.locator('body').innerText()
			throw new Error(
				`results never rendered: ${error.message}\npage errors: ${pageErrors.join('\n')}\n` +
					`console errors:\n${consoleErrors.join('\n')}\npage text:\n${body.slice(0, 3000)}`,
			)
		}
		// Overview table rows: [metric, full, treeshake] for size, load time, modules, saved %.
		const rows = await results
			.locator('table')
			.first()
			.locator('tbody tr')
			.evaluateAll((trs) => trs.map((tr) => [...tr.cells].map((td) => td.innerText.trim())))
		console.log('results overview:', JSON.stringify(rows))
		const kb = (cell) => Number(/^([\d.]+) KB$/.exec(cell)?.[1])
		const [fullKb, shakenKb] = [kb(rows[0][1]), kb(rows[0][2])]
		assert.ok(fullKb > 0 && shakenKb > 0, `both bundles were loaded and measured: ${rows[0]}`)
		assert.ok(shakenKb < fullKb, `tree-shaken antd (${shakenKb} KB) is smaller than full (${fullKb} KB)`)
		assert.equal(Number(rows[2][1]), antdFull.modules.length, 'full module count comes from the full build')
		assert.equal(Number(rows[2][2]), 3, 'treeshake module count is the three demo exports')
		assert.match(rows[3][2], /^\d+(\.\d)?%$/, 'saved percentage is shown')
		assert.deepEqual(pageErrors.map(String), [], 'no uncaught page errors')
		console.log('✓ UI rendered the analysis results')
	} finally {
		await browser.close()
	}
}

try {
	await waitForHealth(origin)
	await checkAdapterRoutes()
	await runAnalyzeFlow()
	console.log('treeshake-frontend adapter: all assertions passed')
} finally {
	await stop()
}
// Builds leave the server's pnpm maintenance timers behind; nothing else to wait for.
process.exit(0)
