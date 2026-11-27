import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const fixtureDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Fresh per-run directories. The server installs every build project with pnpm and then
 * schedules `pnpm store prune`; pointing it at its own store keeps that prune away from
 * the machine-wide store other installs are using.
 */
export function freshDir(name) {
	const dir = path.join(fixtureDir, name)
	fs.rmSync(dir, { recursive: true, force: true })
	fs.mkdirSync(dir, { recursive: true })
	return dir
}

/**
 * Environment for the server's own `pnpm i` / `pnpm build` of each build project.
 * The project template pins its Rspack canary through `pnpm.overrides` in package.json,
 * which pnpm >= 11 ignores, so the server runs with the pnpm core itself uses (fixture
 * devDependency) instead of whatever pnpm happens to be global.
 */
export function serverEnv(extra = {}) {
	const bin = path.join(fixtureDir, 'node_modules', '.bin')
	const pnpmVersion = JSON.parse(
		fs.readFileSync(path.join(fixtureDir, 'node_modules', 'pnpm', 'package.json'), 'utf-8'),
	).version
	console.log(`build projects use pnpm ${pnpmVersion}`)
	return {
		...process.env,
		PATH: `${bin}${path.delimiter}${process.env.PATH}`,
		...extra,
	}
}

export async function waitForHealth(origin, timeoutMs = 60_000) {
	const url = `${origin}/tree-shaking-shared/healthz`
	const start = Date.now()
	let lastError
	while (Date.now() - start < timeoutMs) {
		try {
			const res = await fetch(url)
			if (res.ok) return res.json()
			lastError = new Error(`HTTP ${res.status}`)
		} catch (error) {
			lastError = error
		}
		await new Promise((r) => setTimeout(r, 300))
	}
	throw new Error(`treeshake server at ${origin} never became healthy: ${lastError}`)
}

export async function postJson(url, body) {
	const started = Date.now()
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body),
	})
	const text = await res.text()
	let json
	try {
		json = JSON.parse(text)
	} catch {
		json = undefined
	}
	console.log(`POST ${new URL(url).pathname} -> ${res.status} in ${Date.now() - started}ms`)
	return { status: res.status, json, text }
}

export async function get(url) {
	const res = await fetch(url)
	const body = await res.text()
	return { status: res.status, type: res.headers.get('content-type') ?? '', body }
}

/** A failed build response carries the server's command output; show it, then fail. */
export function expectSuccess(label, res) {
	if (res.status !== 200 || res.json?.status !== 'success') {
		throw new Error(`${label} did not succeed (HTTP ${res.status}):\n${res.text.slice(0, 8000)}`)
	}
	return res.json
}

export function listFiles(dir) {
	const out = []
	for (const entry of fs.readdirSync(dir, { withFileTypes: true, recursive: true })) {
		if (entry.isFile()) out.push(path.relative(dir, path.join(entry.parentPath, entry.name)))
	}
	return out
}
