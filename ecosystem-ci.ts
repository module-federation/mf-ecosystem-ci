import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { cac } from 'cac'
import { SCOPE_EXCLUDED, STACKS, isStack } from './stacks.ts'
import {
	bisectStack,
	buildStack,
	dirnameFrom,
	stackPackages,
	packStack,
	resolveStackOverrides,
	resolvePkgPrNewOverrides,
	resolveReleaseOverrides,
	setupEnvironment,
	setupStackRepo,
} from './utils.ts'
import type { CommandOptions, RunOptions, Stack } from './types.d.ts'

const stackHelp = `upstream to test: ${Object.keys(STACKS).join(' | ')}`
const cli = cac('mf-ecosystem-ci')

cli
	.command('[...suites]', 'build the upstream stack, then run the selected suites (default: all)')
	.option('--stack <stack>', stackHelp, { default: 'core' })
	.option('--repo <repo>', 'upstream repository (default depends on --stack)')
	.option('--branch <branch>', 'upstream branch to build')
	.option('--tag <tag>', 'upstream tag to build')
	.option('--commit <commit>', 'upstream commit; uses pkg.pr.new previews when they exist')
	.option('--release <version>', 'use an npm version or dist-tag instead of building')
	.option('--verify', 'run upstream and downstream tests before overriding', { default: false })
	.action(async (suites: string[], options: CommandOptions) => {
		const stack = parseStack(options.stack)
		const env = await setupEnvironment(stack)
		const suitesToRun = getSuitesToRun(stack, suites)
		let stackOverrides: Record<string, string> | undefined
		await setupStackRepo(stack, options)
		if (options.release) {
			stackOverrides = await resolveReleaseOverrides(stack, options.release)
		} else if (options.commit) {
			stackOverrides = await resolvePkgPrNewOverrides(stack, options.commit)
		}
		if (!stackOverrides) {
			await buildStack(stack, { verify: options.verify })
			await packStack(stack)
			stackOverrides = await resolveStackOverrides({ stack })
		}
		await runSuites(stack, suitesToRun, {
			stack,
			root: env.root,
			workspace: env.workspace,
			stackPath: env.stackPath,
			stackOverrides,
			verify: options.verify,
		})
	})

cli
	.command('build-stack', 'build and pack the upstream stack into workspace/tarballs/<stack>')
	.option('--stack <stack>', stackHelp, { default: 'core' })
	.option('--repo <repo>', 'upstream repository')
	.option('--branch <branch>', 'upstream branch')
	.option('--tag <tag>', 'upstream tag')
	.option('--commit <commit>', 'upstream commit')
	.option('--verify', 'run upstream tests after building', { default: false })
	.action(async (options: CommandOptions) => {
		const stack = parseStack(options.stack)
		await setupEnvironment(stack)
		await setupStackRepo(stack, options)
		await buildStack(stack, { verify: options.verify })
		await packStack(stack)
	})

cli
	.command('run-suites [...suites]', 'run suites against an already packed stack, a release or pkg.pr.new')
	.option('--stack <stack>', stackHelp, { default: 'core' })
	.option('--repo <repo>', 'upstream repository (for --release/--commit package discovery)')
	.option('--commit <commit>', 'use pkg.pr.new previews for this upstream commit')
	.option('--release <version>', 'use an npm version or dist-tag')
	.option('--verify', 'run downstream tests before overriding', { default: false })
	.action(async (suites: string[], options: CommandOptions) => {
		const stack = parseStack(options.stack)
		const env = await setupEnvironment(stack)
		const suitesToRun = getSuitesToRun(stack, suites)
		const stackOverrides = await resolveStackOverrides({ ...options, stack })
		await runSuites(stack, suitesToRun, {
			stack,
			root: env.root,
			workspace: env.workspace,
			stackPath: env.stackPath,
			stackOverrides,
			verify: options.verify,
		})
	})

cli
	.command('bisect [...suites]', 'git bisect the upstream stack to find the commit that broke suites')
	.option('--stack <stack>', stackHelp, { default: 'core' })
	.option('--good <ref>', 'last known good upstream ref (required)')
	.option('--repo <repo>', 'upstream repository')
	.option('--branch <branch>', 'upstream branch')
	.option('--tag <tag>', 'upstream tag to start from')
	.option('--commit <commit>', 'upstream commit to start from')
	.action(async (suites: string[], options: CommandOptions) => {
		if (!options.good) {
			console.log('you have to specify a known good version with `--good <commit|tag>`')
			process.exit(1)
		}
		const stack = parseStack(options.stack)
		const env = await setupEnvironment(stack)
		const suitesToRun = getSuitesToRun(stack, suites)
		let isFirstRun = true
		const runSuite = async () => {
			try {
				await buildStack(stack)
				await packStack(stack)
				const stackOverrides = await resolveStackOverrides({ stack })
				await runSuites(stack, suitesToRun, {
					stack,
					root: env.root,
					workspace: env.workspace,
					stackPath: env.stackPath,
					stackOverrides,
					skipGit: !isFirstRun,
				})
				isFirstRun = false
				return null
			} catch (e) {
				return e as Error
			}
		}
		await setupStackRepo(stack, { ...options, shallow: false })
		const initialError = await runSuite()
		if (initialError) {
			await bisectStack(options.good, runSuite)
		} else {
			console.log('no errors for starting commit, cannot bisect')
		}
	})

cli
	.command('list', 'list available suites for a stack')
	.option('--stack <stack>', stackHelp, { default: 'core' })
	.option('--json', 'print a JSON array (used to build the CI matrix)', { default: false })
	.action((options: CommandOptions) => {
		const suites = availableSuites(parseStack(options.stack))
		console.log(options.json ? JSON.stringify(suites) : suites.join('\n'))
	})

cli
	.command('coverage', 'fail if any published upstream package is not covered by a suite')
	.option('--stack <stack>', stackHelp, { default: 'core' })
	.option('--repo <repo>', 'upstream repository')
	.option('--branch <branch>', 'upstream branch')
	.option('--json', 'print the coverage map as JSON', { default: false })
	.action(async (options: CommandOptions) => {
		const stack = parseStack(options.stack)
		await checkCoverage(stack, await stackPackageNames(stack, options), !!options.json)
	})

cli
	.command('scope', 'fail if any published @module-federation/* package is not tracked')
	.action(async () => {
		await checkScope()
	})

cli.help()
cli.parse()

function parseStack(value: string): Stack {
	if (!isStack(value)) {
		console.log(`invalid --stack ${value}. ${stackHelp}`)
		process.exit(1)
	}
	return value
}

async function loadSuite(stack: Stack, suite: string) {
	const mod = await import(`./tests/${stack}/${suite}.ts`)
	return {
		test: mod.test as (o: RunOptions) => Promise<void>,
		covers: (mod.covers ?? []) as string[],
		owns: (mod.owns ?? []) as string[],
	}
}

async function runSuites(stack: Stack, suites: string[], options: RunOptions) {
	for (const suite of suites) {
		const { test, covers } = await loadSuite(stack, suite)
		await test({
			...options,
			covers,
			workspace: path.resolve(options.workspace, 'suites', stack, suite),
		})
	}
}

/** Every published upstream package must be claimed by at least one suite. */
async function checkCoverage(stack: Stack, packageNames: string[], json: boolean) {
	// Claims for other stacks' packages (e.g. @module-federation/vite under core) are ignored;
	// a misspelled claim still shows up as an uncovered real package.
	const claimedBy = new Map<string, string[]>(packageNames.map((n) => [n, []]))
	for (const suite of availableSuites(stack)) {
		for (const name of (await loadSuite(stack, suite)).covers) {
			claimedBy.get(name)?.push(suite)
		}
	}
	const gaps = [...claimedBy].filter(([, suites]) => suites.length === 0).map(([n]) => n)
	if (json) {
		console.log(JSON.stringify({ stack, coverage: Object.fromEntries(claimedBy), gaps }, null, 2))
	} else {
		const width = Math.max(...packageNames.map((n) => n.length))
		for (const [name, suites] of claimedBy) {
			console.log(`${suites.length ? '  ' : '✗ '}${name.padEnd(width)}  ${suites.join(', ')}`)
		}
	}
	if (gaps.length) {
		console.error(`\n${gaps.length}/${packageNames.length} ${stack} packages have no suite: ${gaps.join(', ')}`)
		process.exit(1)
	}
	console.log(`\nall ${packageNames.length} ${stack} packages are covered`)
}

/** Package names a stack publishes: the packed manifest (exactly what CI tests), else a fresh checkout. */
async function stackPackageNames(stack: Stack, options: Partial<CommandOptions> = {}) {
	const env = await setupEnvironment(stack)
	const manifestFile = path.join(env.workspace, 'tarballs', stack, 'manifest.json')
	if (fs.existsSync(manifestFile)) {
		return Object.keys(JSON.parse(fs.readFileSync(manifestFile, 'utf-8')).packages).sort()
	}
	await setupStackRepo(stack, options)
	return (await stackPackages(stack, env.stackPath)).map((p) => p.name).sort()
}

/**
 * Every package published under the npm scope must be built by a stack, owned by a suite
 * (a framework plugin built from its own repo, e.g. @module-federation/nuxt), or listed in
 * SCOPE_EXCLUDED with a reason. A new package turns CI red until someone decides.
 */
async function checkScope() {
	const tracked = new Map<string, string>()
	for (const stack of Object.keys(STACKS) as Stack[]) {
		for (const name of await stackPackageNames(stack)) tracked.set(name, `stack ${stack}`)
		for (const suite of availableSuites(stack)) {
			for (const name of (await loadSuite(stack, suite)).owns) {
				if (!tracked.has(name)) tracked.set(name, `suite ${suite}`)
			}
		}
	}
	// The org listing is public and complete; npm's search index is neither.
	const res = await fetch('https://registry.npmjs.org/-/org/module-federation/package')
	if (!res.ok) throw new Error(`npm org listing failed: ${res.status} ${res.statusText}`)
	const published = Object.keys(await res.json()).sort()
	const cutoff = Date.now() - 365 * 24 * 60 * 60 * 1000
	const untracked: string[] = []
	const width = Math.max(...published.map((n) => n.length))
	for (const name of published) {
		let where = tracked.get(name) ?? (SCOPE_EXCLUDED[name] && `excluded: ${SCOPE_EXCLUDED[name]}`)
		if (!where) {
			const last = await lastPublished(name)
			if (last < cutoff) where = `legacy: last published ${new Date(last).toISOString().slice(0, 10)}`
			else untracked.push(name)
		}
		console.log(`${where ? '  ' : '✗ '}${name.padEnd(width)}  ${where ?? 'NOT TRACKED'}`)
	}
	const missing = [...tracked.keys()].filter((n) => n.startsWith('@module-federation/') && !published.includes(n))
	if (missing.length) console.log(`\nnot in the npm org listing yet: ${missing.join(', ')}`)
	if (untracked.length) {
		console.error(
			`\n${untracked.length} published package(s) are not tracked: ${untracked.join(', ')}\n` +
				'Add a suite that covers or owns each one, or list it in SCOPE_EXCLUDED (stacks.ts) with a reason.',
		)
		process.exit(1)
	}
	console.log(`\nall ${published.length} @module-federation/* packages are tracked, excluded with a reason, or legacy`)
}

async function lastPublished(name: string) {
	const res = await fetch(`https://registry.npmjs.org/${name.replace('/', '%2F')}`)
	if (!res.ok) throw new Error(`npm metadata for ${name} failed: ${res.status} ${res.statusText}`)
	const { time = {} } = (await res.json()) as { time?: Record<string, string> }
	const dates = Object.entries(time)
		.filter(([key]) => key !== 'created' && key !== 'modified')
		.map(([, value]) => Date.parse(value))
	return Math.max(0, ...dates)
}

function availableSuites(stack: Stack) {
	const dir = path.join(dirnameFrom(import.meta.url), 'tests', stack)
	return fs
		.readdirSync(dir)
		.filter((f) => !f.startsWith('_') && f.endsWith('.ts'))
		.map((f) => f.slice(0, -3))
		.sort()
}

function getSuitesToRun(stack: Stack, suites: string[]) {
	const available = availableSuites(stack)
	if (suites.length === 0) return available
	const invalid = suites.filter((s) => !s.startsWith('_') && !available.includes(s))
	if (invalid.length) {
		console.log(`invalid suite(s) for --stack ${stack}: ${invalid.join(', ')}`)
		console.log(`available suites: ${available.join(', ')}`)
		process.exit(1)
	}
	return suites
}
