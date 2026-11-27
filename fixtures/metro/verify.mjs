// Asserts on the federated Metro output written by `pnpm build`. Each CLI integration
// (react-native community CLI, Rock, RNEF) writes into its own dist/<cli>/ directory, and
// the `bundle-mf-*` commands only exist when the matching @module-federation plugin
// registered them, so every directory below is proof that plugin ran.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'

const root = path.dirname(new URL(import.meta.url).pathname)
const CLIS = ['rnc', 'rock', 'rnef']
const PLATFORM = 'android'
const REMOTE_ENTRY = 'http://localhost:4300/mf-manifest.json'

function readBundle(file) {
	assert.ok(fs.existsSync(file), `missing ${path.relative(root, file)}`)
	const code = fs.readFileSync(file, 'utf8')
	assert.ok(code.trim().length > 0, `empty ${path.relative(root, file)}`)
	// Compile only: proves the output is syntactically valid JavaScript.
	new vm.Script(code, { filename: file })
	const map = JSON.parse(fs.readFileSync(`${file}.map`, 'utf8'))
	assert.ok(map.sources?.length > 0, `sourcemap for ${path.relative(root, file)} has no sources`)
	return code
}

/** Evaluate a modules-only exposed bundle and return the exports of its module factory. */
function evaluateExposed(code, file) {
	const factories = []
	const context = vm.createContext({
		mini__d: (factory, id, deps) => factories.push({ factory, id, deps }),
	})
	context.__FEDERATION__ = {
		__NATIVE__: { mini: { deps: { shared: {}, remotes: {} } } },
	}
	vm.runInContext(code, context, { filename: file })
	assert.equal(factories.length, 1, `${file}: expected one module factory`)
	const module = { exports: {} }
	const fail = (dep) => {
		throw new Error(`unexpected require(${dep}) from ${file}`)
	}
	factories[0].factory(context, fail, fail, fail, module, module.exports, [])
	return module.exports
}

function checkRemote(cli) {
	const out = path.join(root, 'mini', 'dist', cli, PLATFORM)
	const label = `mini via ${cli}`

	const manifest = JSON.parse(fs.readFileSync(path.join(out, 'mf-manifest.json'), 'utf8'))
	assert.equal(manifest.name, 'mini', `${label}: manifest name`)
	assert.equal(manifest.metaData.remoteEntry.name, 'mini.bundle', `${label}: remoteEntry`)
	assert.deepEqual(
		manifest.exposes.map((e) => e.path).sort(),
		['./info', './utils'],
		`${label}: manifest exposes`,
	)
	for (const expose of manifest.exposes) {
		assert.match(expose.hash, /^[0-9a-f]{64}$/, `${label}: ${expose.path} hash`)
	}
	const shared = Object.fromEntries(manifest.shared.map((s) => [s.name, s]))
	for (const name of ['react', 'react-native', 'lodash']) {
		assert.ok(shared[name], `${label}: manifest shares ${name}`)
	}
	assert.deepEqual(shared.lodash.assets.js.sync, ['shared/lodash.bundle'], `${label}: lodash asset`)

	const container = readBundle(path.join(out, 'mini.bundle'))
	for (const expose of ['"./info"', '"./utils"']) {
		assert.ok(container.includes(expose), `${label}: container exposes ${expose}`)
	}
	assert.ok(container.includes("__METRO_GLOBAL_PREFIX__='mini'"), `${label}: container uses the mini global prefix`)

	const info = readBundle(path.join(out, 'exposed', 'info.bundle'))
	assert.ok(info.includes('MF_FIXTURE_MINI_INFO'), `${label}: exposed/info has the component`)

	const utilsFile = path.join(out, 'exposed', 'utils.bundle')
	const utils = evaluateExposed(readBundle(utilsFile), utilsFile)
	assert.equal(utils.greet('host'), 'MF_FIXTURE_MINI_UTILS: hello host', `${label}: exposed/utils runs`)

	const lodash = readBundle(path.join(out, 'shared', 'lodash.bundle'))
	assert.ok(lodash.includes('4.18.1'), `${label}: shared lodash bundle`)

	console.log(`ok ${label}: manifest, container, 2 exposes, shared lodash`)
}

function checkHost(cli) {
	const file = path.join(root, 'host', 'dist', cli, PLATFORM, `index.${PLATFORM}.bundle`)
	const label = `host via ${cli}`
	const code = readBundle(file)
	assert.ok(code.includes(REMOTE_ENTRY), `${label}: references the mini remote entry`)
	assert.ok(code.includes('entryGlobalName:"mini"'), `${label}: registers the mini remote`)
	for (const request of ['mini/info', 'mini/utils']) {
		assert.ok(code.includes(`"${request}"`), `${label}: loads ${request} as a remote module`)
	}
	assert.ok(code.includes('mf-fixture-host-runtime-plugin'), `${label}: bundles the runtime plugin`)
	assert.ok(code.includes('MF_FIXTURE_HOST_APP'), `${label}: bundles the app`)
	assert.ok(!code.includes('MF_FIXTURE_MINI'), `${label}: remote code must not be inlined`)
	console.log(`ok ${label}: ${(code.length / 1024).toFixed(0)} KiB, wired to ${REMOTE_ENTRY}`)
}

for (const cli of CLIS) {
	checkRemote(cli)
	checkHost(cli)
}
console.log(`metro fixture: ${CLIS.length} CLIs x (remote + host) verified`)
