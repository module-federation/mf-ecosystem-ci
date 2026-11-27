// Serve the remote's build output, run `mf dts --generate false` from @module-federation/cli
// like a user would, then assert the downloaded types and typecheck code that uses them.
import assert from 'node:assert/strict'
import { spawnSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

const PORT = 4581
const hostDir = path.resolve(import.meta.dirname, '..')
const remoteDist = path.resolve(hostDir, '../remote/dist')
const typesDir = path.join(hostDir, '@mf-types')

assert.ok(fs.existsSync(path.join(remoteDist, '@mf-types.zip')), 'remote has not generated @mf-types.zip yet')
fs.rmSync(typesDir, { recursive: true, force: true })

const requests = []
const server = http.createServer((req, res) => {
	const url = decodeURIComponent(new URL(req.url, 'http://x').pathname)
	requests.push(url)
	const file = path.join(remoteDist, url)
	if (!file.startsWith(remoteDist) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
		res.writeHead(404).end()
		return
	}
	res.writeHead(200, { 'content-type': 'application/octet-stream' })
	fs.createReadStream(file).pipe(res)
})
await new Promise((resolve, reject) => server.listen(PORT, resolve).on('error', reject))

const run = (cmd, args) =>
	new Promise((resolve, reject) => {
		console.log(`$ ${cmd} ${args.join(' ')}`)
		spawn(cmd, args, { cwd: hostDir, stdio: 'inherit' })
			.on('error', reject)
			.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} exited with ${code}`))))
	})

try {
	await run('pnpm', ['run', 'dts'])
} finally {
	server.close()
}

console.log('requests served:', requests)
assert.ok(requests.includes('/@mf-types.zip'), 'mf dts did not download the types archive')
assert.ok(requests.includes('/@mf-types.d.ts'), 'mf dts did not download the API types')

const expectFile = (rel, pattern) => {
	const file = path.join(typesDir, rel)
	assert.ok(fs.existsSync(file), `missing ${path.relative(hostDir, file)}`)
	if (pattern) {
		const text = fs.readFileSync(file, 'utf-8')
		assert.match(text, pattern, `${path.relative(hostDir, file)} does not match ${pattern}`)
	}
}
expectFile('remote/Button.d.ts')
expectFile('remote/schema.d.ts')
expectFile('remote/compiled-types/Button.d.ts', /import\("react\/jsx-runtime"\)\.JSX\.Element/)
expectFile('remote/compiled-types/schema.d.ts', /from ['"]zod['"]/)
// Extracted third-party types travel inside the archive, next to the remote's own d.ts.
expectFile('remote/node_modules/zod/package.json', /"name": "zod"/)
expectFile('remote/node_modules/zod/index.d.ts')
expectFile('remote/node_modules/@types/react/package.json', /"name": "@types\/react"/)
expectFile('remote/node_modules/@types/react/jsx-runtime.d.ts')
// consumeAPITypes: the remote's API types with the placeholder replaced by this host's alias,
// plus an index that types loadRemote() for the runtime packages.
expectFile('remote/apis.d.ts', /'remote\/Button'/)
assert.doesNotMatch(fs.readFileSync(path.join(typesDir, 'remote/apis.d.ts'), 'utf-8'), /REMOTE_ALIAS_IDENTIFIER/)
expectFile('index.d.ts', /declare module "@module-federation\/runtime"[\s\S]*loadRemote<T extends RemoteKeys/)

for (const pkg of ['zod', 'react', '@types/react']) {
	assert.ok(!fs.existsSync(path.join(hostDir, 'node_modules', pkg)), `host must not install ${pkg} itself`)
}

const tsc = spawnSync('pnpm', ['run', 'typecheck'], { cwd: hostDir, stdio: 'inherit' })
assert.equal(tsc.status, 0, 'host code does not typecheck against the consumed remote types')
console.log('mf dts (consume): types downloaded, third-party types present, host typechecks')
