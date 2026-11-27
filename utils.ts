import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import * as actionsCore from '@actions/core'
import { AGENTS, detect, getCommand, serializeCommand } from '@antfu/ni'
import { getPackages } from '@manypkg/get-packages'
import { execa, parseCommandString } from 'execa'
import YAML from 'yaml'
import { STACKS } from './stacks.ts'
import type {
	Agent,
	CommandOptions,
	EnvironmentData,
	Overrides,
	ProcessEnv,
	RepoOptions,
	RunOptions,
	Stack,
	StackPackage,
	TarballManifest,
	Task,
} from './types.d.ts'

const isGitHubActions = !!process.env.GITHUB_ACTIONS

let root: string
let workspace: string
let stackPath: string
let cwd: string
let env: ProcessEnv

export function cd(dir: string) {
	cwd = path.resolve(cwd, dir)
}

/**
 * Run a command in the current working directory (see `cd`), streaming its output.
 * Arguments are split on spaces and never go through a shell, so globs and braces
 * such as `--filter {./app/**}...` are passed through verbatim.
 */
export async function $(literals: TemplateStringsArray, ...values: unknown[]) {
	const cmd = literals.reduce(
		(result, current, i) => result + current + (values?.[i] != null ? `${values[i]}` : ''),
		'',
	)
	return exec(cmd, { cwd })
}

export async function exec(
	cmd: string,
	options: { cwd: string; timeout?: number; env?: Record<string, string> },
) {
	if (isGitHubActions) {
		actionsCore.startGroup(`${options.cwd} $> ${cmd}`)
	} else {
		console.log(`${options.cwd} $> ${cmd}`)
	}
	// stdin is ignored: nothing here is interactive, and an open, never-closed pipe can hang children.
	const proc = execa({
		env: options.env ? { ...env, ...options.env } : env,
		stdin: 'ignore',
		stdout: 'pipe',
		stderr: 'pipe',
		cwd: options.cwd,
		timeout: options.timeout,
	})`${parseCommandString(cmd)}`
	proc.stdout?.pipe(process.stdout)
	proc.stderr?.pipe(process.stderr)
	try {
		const result = await proc
		return result.stdout
	} catch (error: any) {
		// Output was already streamed; keep the thrown error readable.
		const removed = 'value removed by mf-ecosystem-ci'
		if (error.stdout) error.stdout = removed
		if (error.stderr) error.stderr = removed
		if (error.stdio) error.stdio = [removed]
		throw error
	} finally {
		if (isGitHubActions) actionsCore.endGroup()
	}
}

export function dirnameFrom(url: string) {
	return path.dirname(fileURLToPath(url))
}

export async function setupEnvironment(stack: Stack): Promise<EnvironmentData> {
	const nodeMajor = Number(process.versions.node.split('.')[0])
	if (nodeMajor !== 24) {
		// Downstream repos target Node 24; newer Node hangs e.g. Playwright 1.58's browser unzip.
		console.warn(
			`\n!! running on Node ${process.versions.node}; ecosystem-ci expects Node 24 (see .nvmrc). Results may differ from CI.\n`,
		)
	}
	root = dirnameFrom(import.meta.url)
	workspace = path.resolve(root, 'workspace')
	stackPath = path.resolve(workspace, stack)
	cwd = process.cwd()
	env = {
		...process.env,
		CI: 'true',
		ECOSYSTEM_CI: 'true', // downstream tests can use this to skip irrelevant work
		TURBO_FORCE: 'true', // overrides change inputs turbo cannot see; never replay cached results
		TURBO_TELEMETRY_DISABLED: '1',
		NX_DAEMON: 'false',
		NX_SKIP_NX_CACHE: 'true',
		YARN_ENABLE_IMMUTABLE_INSTALLS: 'false',
		NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=6144', // GH runners have 7GB
		DO_NOT_TRACK: '1',
	}
	initWorkspace(workspace)
	return { root, workspace, stackPath, cwd, env }
}

function initWorkspace(dir: string) {
	fs.mkdirSync(dir, { recursive: true })
	// Stop tooling in cloned repos from walking up into this repository's config.
	const stubs: Record<string, string> = {
		'.eslintrc.json': '{"root":true}\n',
		'.editorconfig': 'root = true\n',
		'tsconfig.json': '{}\n',
	}
	for (const [file, content] of Object.entries(stubs)) {
		const target = path.join(dir, file)
		if (!fs.existsSync(target)) fs.writeFileSync(target, content, 'utf-8')
	}
}

export async function setupRepo(options: RepoOptions) {
	const branch = options.branch ?? 'main'
	const shallow = options.shallow ?? true
	const { commit, tag, dir } = options
	let { repo } = options
	if (!dir) throw new Error('setupRepo must be called with options.dir')
	if (!repo.includes(':')) repo = `https://github.com/${repo}.git`

	let needClone = true
	if (fs.existsSync(dir)) {
		const previous = cwd
		cd(dir)
		let currentRepo: string | undefined
		try {
			currentRepo = (await $`git ls-remote --get-url`).trim()
		} catch {
			// not a git checkout
		}
		if (currentRepo === repo) {
			const isShallow = (await $`git rev-parse --is-shallow-repository`).trim() === 'true'
			needClone = isShallow !== shallow
		}
		cd(previous)
		if (needClone) fs.rmSync(dir, { recursive: true, force: true })
	}

	if (needClone) {
		await $`git -c advice.detachedHead=false clone ${
			shallow ? '--depth=1 --no-tags' : ''
		} --branch ${tag || branch} ${repo} ${dir}`
	}
	cd(dir)
	await $`git clean -fdxq`
	if (!needClone && shallow && !commit) {
		await $`git remote set-branches origin ${branch}`
	}
	await $`git fetch ${shallow ? '--depth=1 --no-tags' : '--tags'} origin ${
		tag ? `tag ${tag}` : commit || branch
	}`
	if (shallow) {
		await $`git -c advice.detachedHead=false checkout ${tag ? `tags/${tag}` : commit || 'FETCH_HEAD'}`
	} else {
		await $`git checkout ${branch}`
		await $`git merge FETCH_HEAD`
		if (tag || commit) await $`git reset --hard ${tag || commit}`
	}
}

// ---------------------------------------------------------------------------
// Upstream stack (module-federation/core, module-federation/vite)
// ---------------------------------------------------------------------------

export async function setupStackRepo(stack: Stack, options: Partial<RepoOptions> = {}) {
	const definition = STACKS[stack]
	await setupRepo({
		repo: options.repo || definition.repo,
		branch: options.branch || definition.branch,
		tag: options.tag,
		commit: options.commit,
		shallow: options.shallow ?? true,
		dir: stackPath,
	})
}

export async function buildStack(stack: Stack, { verify = false } = {}) {
	cd(stackPath)
	await $`pnpm install --frozen-lockfile`
	await $`${STACKS[stack].build}`
	const verifyCommand = STACKS[stack].verify
	if (verify && verifyCommand) await $`${verifyCommand}`
}

export async function getPermanentRef() {
	cd(stackPath)
	try {
		return (await $`git rev-parse HEAD`).trim()
	} catch (e) {
		console.warn(`Failed to obtain permanent ref. ${e}`)
		return undefined
	}
}

/** Public packages published from a checkout, including a publishable workspace root. */
export async function discoverPackages(
	dir: string,
	{ includePrivate = false } = {},
): Promise<StackPackage[]> {
	const result: StackPackage[] = []
	const add = (pkgDir: string, json: { name?: string; version?: string; private?: boolean }) => {
		if (!json.name || (!includePrivate && json.private)) return
		result.push({ name: json.name, version: json.version ?? '0.0.0', dir: pkgDir })
	}
	try {
		const { packages, rootPackage } = await getPackages(dir)
		if (rootPackage) add(rootPackage.dir, rootPackage.packageJson)
		for (const pkg of packages) {
			if (pkg.dir !== rootPackage?.dir) add(pkg.dir, pkg.packageJson)
		}
	} catch {
		const pkgFile = path.join(dir, 'package.json')
		if (fs.existsSync(pkgFile)) add(dir, JSON.parse(fs.readFileSync(pkgFile, 'utf-8')))
	}
	return result
}

function tarballDir(stack: Stack) {
	return path.join(workspace, 'tarballs', stack)
}

/**
 * Pack every public upstream package into a tarball. Tarballs install like real npm
 * releases: dependencies and peers resolve inside the downstream project, so plugins
 * see the downstream's own webpack/rspack/vite instance instead of upstream's copy.
 */
/** The packages a stack publishes (see StackDefinition.packages), found in its checkout. */
export async function stackPackages(stack: Stack, dir = stackPath) {
	const only = STACKS[stack].packages
	const packages = await discoverPackages(dir)
	return only ? packages.filter((p) => only.includes(p.name)) : packages
}

export async function packStack(stack: Stack) {
	const outDir = tarballDir(stack)
	fs.rmSync(outDir, { recursive: true, force: true })
	fs.mkdirSync(outDir, { recursive: true })
	const packages = await stackPackages(stack)
	if (!packages.length) throw new Error(`no public packages found in ${stackPath}`)
	const manifest: TarballManifest = {
		stack,
		repo: STACKS[stack].repo,
		ref: (await getPermanentRef()) ?? 'unknown',
		createdAt: new Date().toISOString(),
		packages: {},
	}
	for (const pkg of packages) {
		const dest = path.join(outDir, pkg.name.replace(/^@/, '').replace('/', '__'))
		fs.mkdirSync(dest, { recursive: true })
		await exec(`pnpm pack --pack-destination ${dest}`, { cwd: pkg.dir })
		const tgz = fs.readdirSync(dest).find((f) => f.endsWith('.tgz'))
		if (!tgz) throw new Error(`pnpm pack produced no tarball for ${pkg.name}`)
		manifest.packages[pkg.name] = path.relative(outDir, path.join(dest, tgz))
	}
	const manifestFile = path.join(outDir, 'manifest.json')
	fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`)
	console.log(`packed ${packages.length} ${stack} packages -> ${manifestFile}`)
	return manifestFile
}

export function readTarballOverrides(stack: Stack): Record<string, string> {
	const outDir = tarballDir(stack)
	const manifestFile = path.join(outDir, 'manifest.json')
	if (!fs.existsSync(manifestFile)) {
		throw new Error(
			`no packed ${stack} build at ${manifestFile}. Run \`build-stack --stack ${stack}\` first, or pass --release / --commit.`,
		)
	}
	const manifest: TarballManifest = JSON.parse(fs.readFileSync(manifestFile, 'utf-8'))
	console.log(`using ${stack} tarballs from ${manifest.repo}@${manifest.ref}`)
	return Object.fromEntries(
		Object.entries(manifest.packages).map(([name, rel]) => [
			name,
			`file:${path.join(outDir, rel)}`,
		]),
	)
}

function registryUrl(name: string) {
	return `https://registry.npmjs.org/${name.replace('/', '%2f')}`
}

/**
 * `--release` accepts a dist-tag (`latest`, `next`, `canary`) or an exact version.
 * Packages in the stack follow different version lines (nextjs-mf 8.x, node 2.7.x,
 * runtime 2.9.x), so each name resolves independently and missing ones are skipped.
 */
export async function resolveReleaseOverrides(stack: Stack, release: string) {
	const packages = await stackPackages(stack)
	const overrides: Record<string, string> = {}
	const skipped: string[] = []
	await Promise.all(
		packages.map(async ({ name }) => {
			const res = await fetch(registryUrl(name), {
				headers: { accept: 'application/vnd.npm.install-v1+json' },
			})
			if (!res.ok) return skipped.push(`${name} (HTTP ${res.status})`)
			const doc = (await res.json()) as {
				'dist-tags'?: Record<string, string>
				versions?: Record<string, unknown>
			}
			const version = doc['dist-tags']?.[release] ?? (doc.versions?.[release] ? release : undefined)
			if (version) overrides[name] = version
			else skipped.push(name)
		}),
	)
	if (!Object.keys(overrides).length) {
		throw new Error(`--release ${release} matched no ${stack} package on npm`)
	}
	if (skipped.length) console.warn(`--release ${release}: not published for ${skipped.join(', ')}`)
	return overrides
}

/** Resolve pkg.pr.new preview URLs for a commit. Returns undefined when none exist. */
export async function resolvePkgPrNewOverrides(stack: Stack, sha: string) {
	const templates = STACKS[stack].pkgPrNew ?? []
	if (!templates.length) return undefined
	const packages = await stackPackages(stack)
	const overrides: Record<string, string> = {}
	await Promise.all(
		packages.map(async ({ name }) => {
			for (const template of templates) {
				const url = template.replace('{name}', name).replace('{sha}', sha)
				const res = await fetch(url, { method: 'HEAD' })
				if (res.ok) {
					overrides[name] = url
					return
				}
			}
		}),
	)
	if (!Object.keys(overrides).length) return undefined
	const missing = packages.filter((p) => !overrides[p.name]).map((p) => p.name)
	if (missing.length) {
		console.warn(`pkg.pr.new has no preview for ${missing.join(', ')}; those keep their pinned versions`)
	}
	console.log(`using pkg.pr.new previews for ${Object.keys(overrides).length} ${stack} packages`)
	return overrides
}

/** Pick the override source for `run-suites`: --release, then --commit previews, then local tarballs. */
export async function resolveStackOverrides(options: CommandOptions) {
	const { stack } = options
	if (options.release || options.commit) {
		// Only needed to discover package names; nothing is built.
		await setupStackRepo(stack, { repo: options.repo, commit: options.commit })
	}
	if (options.release) return resolveReleaseOverrides(stack, options.release)
	if (options.commit) {
		const previews = await resolvePkgPrNewOverrides(stack, options.commit)
		if (previews) return previews
		throw new Error(
			`no pkg.pr.new previews for ${stack}@${options.commit}; build it with \`build-stack --commit\` and run without --commit`,
		)
	}
	return readTarballOverrides(stack)
}

export async function bisectStack(
	good: string,
	runSuite: () => Promise<Error | void | null>,
) {
	const resetChanges = async () => $`git reset --hard HEAD`
	try {
		cd(stackPath)
		await resetChanges()
		await $`git bisect start`
		await $`git bisect bad`
		await $`git bisect good ${good}`
		let bisecting = true
		while (bisecting) {
			const commitMsg = await $`git log -1 --format=%s`
			const isNonCodeCommit = commitMsg.match(/^(?:release|docs|chore|ci)[:(]/i)
			if (isNonCodeCommit) {
				await $`git bisect skip`
				continue
			}
			const error = await runSuite()
			cd(stackPath)
			await resetChanges()
			const bisectOut = await $`git bisect ${error ? 'bad' : 'good'}`
			bisecting = bisectOut.startsWith('Bisecting')
		}
	} catch (e) {
		console.error('error while bisecting', e)
	} finally {
		try {
			cd(stackPath)
			await $`git bisect reset`
		} catch (e) {
			console.error('Error while resetting bisect', e)
		}
	}
}

// ---------------------------------------------------------------------------
// Downstream suites
// ---------------------------------------------------------------------------

function toCommand(task: Task | Task[] | undefined, agent: Agent) {
	return async (scripts: Record<string, string> = {}) => {
		const tasks = Array.isArray(task) ? task : [task]
		for (const item of tasks) {
			if (item == null || item === '') continue
			if (typeof item === 'string') {
				if (scripts[item] != null) {
					await $`${serializeCommand(getCommand(agent, 'run', [item]))}`
				} else {
					await $`${item}`
				}
			} else if (typeof item === 'function') {
				await item()
			} else if (item.script) {
				if (scripts[item.script] == null) {
					throw new Error(`invalid task, script "${item.script}" does not exist in package.json`)
				}
				await $`${serializeCommand(getCommand(agent, 'run', [item.script, ...(item.args ?? [])]))}`
			} else {
				throw new Error(`invalid task, expected string or function but got ${typeof item}`)
			}
		}
	}
}

export async function runInRepo(options: RunOptions & RepoOptions) {
	const verify = options.verify ?? false
	const skipGit = options.skipGit ?? false
	const branch = options.branch ?? 'main'
	const { repo, tag, commit } = options

	const dir = path.resolve(options.workspace, options.dir || repo.substring(repo.lastIndexOf('/') + 1))

	if (!skipGit) {
		await setupRepo({ repo, dir, branch, tag, commit })
	} else {
		cd(dir)
	}

	const agent = options.agent ?? (await detect({ cwd: dir, autoInstall: false }))
	if (!agent) throw new Error(`Failed to detect package manager in ${dir}`)
	if (!AGENTS.includes(agent)) {
		throw new Error(`Invalid agent ${agent}. Allowed values: ${AGENTS.join(', ')}`)
	}

	const pkgFile = path.join(dir, 'package.json')
	const pkg = JSON.parse(await fs.promises.readFile(pkgFile, 'utf-8'))

	await toCommand(options.beforeInstall, agent)(pkg.scripts)

	if (verify && options.test) {
		// Baseline: prove the downstream passes with its own lockfile before we touch it.
		await $`${serializeCommand(getCommand(agent, 'frozen'))}`
		await toCommand(options.beforeBuild, agent)(pkg.scripts)
		await toCommand(options.build, agent)(pkg.scripts)
		await toCommand(options.beforeTest, agent)(pkg.scripts)
		await toCommand(options.test, agent)(pkg.scripts)
	}

	const overrides = await computeOverrides(dir, options.stackOverrides, options.overrides)
	await applyPackageOverrides(agent, dir, pkg, overrides)
	if (options.install) {
		await toCommand(options.install, agent)(pkg.scripts)
	} else {
		await installDependencies(agent)
	}
	if (agent.startsWith('pnpm')) assertOverridesResolved(dir, overrides, options.covers)

	await toCommand(options.beforeBuild, agent)(pkg.scripts)
	await toCommand(options.build, agent)(pkg.scripts)
	if (options.test) {
		await toCommand(options.beforeTest, agent)(pkg.scripts)
		await toCommand(options.test, agent)(pkg.scripts)
	}
	return { dir, agent }
}

/**
 * Run a project from `fixtures/<name>` (owned by this repo) instead of a cloned repo.
 * Used for packages that have no public downstream example. The fixture is copied into
 * the suite workspace and committed to a throwaway git repo so `git clean` resets it.
 */
export async function runFixture(
	options: RunOptions & Omit<RepoOptions, 'repo' | 'dir'> & { fixture: string },
) {
	const src = path.join(root, 'fixtures', options.fixture)
	if (!fs.existsSync(src)) throw new Error(`fixture not found: ${src}`)
	const dir = path.resolve(options.workspace, options.fixture)
	if (!options.skipGit) {
		fs.rmSync(dir, { recursive: true, force: true })
		fs.cpSync(src, dir, {
			recursive: true,
			filter: (p) => !/[\\/](node_modules|dist|\.turbo)([\\/]|$)/.test(p),
		})
		await exec('git init -q', { cwd: dir })
		await exec('git add -A', { cwd: dir })
		await exec('git -c user.name=ecosystem-ci -c user.email=ci@localhost commit -qm fixture', { cwd: dir })
	}
	return runInRepo({
		...options,
		repo: `fixtures/${options.fixture}`,
		dir: options.fixture,
		skipGit: true,
		agent: options.agent ?? 'pnpm',
		verify: false, // fixtures ship without a lockfile, so there is no baseline to verify
	})
}

/**
 * Stack overrides minus packages the downstream workspace builds itself (e.g. the
 * vite repo *is* `@module-federation/vite`), plus suite-specific overrides.
 */
async function computeOverrides(
	dir: string,
	stackOverrides: Record<string, string>,
	suiteOverrides: Overrides = {},
) {
	const owned = new Set((await discoverPackages(dir, { includePrivate: true })).map((p) => p.name))
	const result: Record<string, string> = {}
	const skipped: string[] = []
	for (const [name, spec] of Object.entries(stackOverrides)) {
		if (owned.has(name)) skipped.push(name)
		else result[name] = spec
	}
	for (const [name, spec] of Object.entries(suiteOverrides)) {
		if (spec === false) delete result[name]
		else result[name] = spec
	}
	if (skipped.length) console.log(`not overriding workspace-owned packages: ${skipped.join(', ')}`)
	console.log(`overriding ${Object.keys(result).length} packages`)
	return result
}

export async function applyPackageOverrides(
	agent: Agent,
	dir: string,
	pkg: any,
	overrides: Record<string, string>,
) {
	cd(dir)
	await $`git clean -fdxq` // drop the baseline install
	const pm = agent.split('@')[0]

	if (pm === 'pnpm') {
		const workspaceFile = path.join(dir, 'pnpm-workspace.yaml')
		if (fs.existsSync(workspaceFile)) {
			const doc = YAML.parseDocument(await fs.promises.readFile(workspaceFile, 'utf-8'))
			for (const [name, spec] of Object.entries(overrides)) doc.setIn(['overrides', name], spec)
			// Local tarballs and pkg.pr.new URLs are "exotic" and brand new; relax the gates.
			doc.set('minimumReleaseAge', 0)
			doc.set('blockExoticSubdeps', false)
			doc.set('strictDepBuilds', false)
			await fs.promises.writeFile(workspaceFile, doc.toString(), 'utf-8')
			if (pkg.pnpm?.overrides) {
				pkg.pnpm.overrides = { ...pkg.pnpm.overrides, ...overrides }
			}
		} else {
			pkg.pnpm ??= {}
			pkg.pnpm.overrides = { ...pkg.pnpm.overrides, ...overrides }
		}
	} else if (pm === 'yarn') {
		pkg.resolutions = { ...pkg.resolutions, ...overrides }
	} else if (pm === 'npm') {
		pkg.overrides = { ...pkg.overrides, ...overrides }
		// npm refuses to override direct dependencies, so rewrite them in place.
		for (const [name, version] of Object.entries(overrides)) {
			if (pkg.dependencies?.[name]) pkg.dependencies[name] = version
			if (pkg.devDependencies?.[name]) pkg.devDependencies[name] = version
		}
	} else {
		throw new Error(`unsupported package manager: ${pm}`)
	}
	await fs.promises.writeFile(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2), 'utf-8')
}

async function installDependencies(agent: Agent) {
	const pm = agent.split('@')[0]
	if (pm === 'pnpm') {
		await $`pnpm install --no-frozen-lockfile --config.strict-peer-dependencies=false`
	} else if (pm === 'yarn') {
		await $`yarn install`
	} else {
		await $`npm install`
	}
}

/**
 * Fail loudly when an overridden package still resolved from the registry. A silent
 * fallthrough would turn every suite green while testing nothing.
 */
export function assertOverridesResolved(
	dir: string,
	overrides: Record<string, string>,
	covers: string[] = [],
) {
	// A suite that claims a package must actually install it, or the coverage claim is hollow.
	// pnpm hoists every installed package into node_modules/.pnpm/node_modules.
	const notInstalled = covers.filter(
		(name) =>
			overrides[name] &&
			!fs.existsSync(path.join(dir, 'node_modules', '.pnpm', 'node_modules', name)) &&
			!fs.existsSync(path.join(dir, 'node_modules', name)),
	)
	if (notInstalled.length) {
		throw new Error(`suite claims to cover packages it never installed: ${notInstalled.join(', ')}`)
	}
	const lockFile = path.join(dir, 'pnpm-lock.yaml')
	if (!fs.existsSync(lockFile)) return
	// pnpm 11+ prepends a document for its own toolchain (`---` separated), so read them all.
	const docs = YAML.parseAllDocuments(fs.readFileSync(lockFile, 'utf-8'))
	const keys = [...docs].flatMap((doc) => Object.keys(doc.toJS({ maxAliasCount: -1 })?.packages ?? {}))
	const stale: string[] = []
	let resolved = 0
	for (const key of keys) {
		const at = key.lastIndexOf('@')
		if (at <= 0) continue
		const name = key.slice(0, at)
		const spec = overrides[name]
		if (!spec) continue
		const version = key.slice(at + 1)
		const isExact = /^\d/.test(spec)
		if (isExact ? version === spec : !/^\d/.test(version)) resolved++
		else stale.push(key)
	}
	if (stale.length) {
		throw new Error(
			`overrides did not apply; these resolved from the registry instead:\n  ${stale.join('\n  ')}`,
		)
	}
	console.log(`verified ${resolved} overridden package entries in pnpm-lock.yaml`)
}

/** Install Playwright's Chromium once per suite (system deps only on Linux CI). */
export async function installPlaywright() {
	const withDeps = process.platform === 'linux' && isGitHubActions ? ' --with-deps' : ''
	// Hard cap: a stuck browser unzip otherwise hangs the whole suite with no output.
	await exec(`pnpm exec playwright install chromium${withDeps}`, { cwd, timeout: 10 * 60_000 })
}

/** Run each task, collecting failures so one broken target does not hide the rest. */
export async function runAll(label: string, items: string[], fn: (item: string) => Promise<unknown>) {
	const failures: { item: string; error: unknown }[] = []
	for (const item of items) {
		try {
			await fn(item)
		} catch (error) {
			console.error(`${label}: ${item} failed`)
			failures.push({ item, error })
		}
	}
	if (failures.length) {
		const summary = failures.map((f) => f.item).join(', ')
		throw new Error(
			`${label}: ${items.length - failures.length}/${items.length} passed, failed: ${summary}`,
			{ cause: failures.map((f) => f.error) },
		)
	}
	console.log(`${label}: all ${items.length} passed`)
}
