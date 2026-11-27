import type { AGENTS } from '@antfu/ni'

export type Stack = 'core' | 'vite'

export type Agent = (typeof AGENTS)[number]

export type Task = string | { script: string; args?: string[] } | (() => Promise<unknown>)

/** Package name -> version spec. `false` drops an override inherited from the stack. */
export type Overrides = Record<string, string | false>

export interface StackDefinition {
	/** GitHub `owner/name` of the upstream repository. */
	repo: string
	branch: string
	/** Command that builds every publishable package in the upstream checkout. */
	build: string
	/** Optional command used by `--verify` to run upstream's own tests first. */
	verify?: string
	/** pkg.pr.new URL prefixes to probe for `--commit`, `{name}` and `{sha}` are substituted. */
	pkgPrNew?: string[]
	/** Published packages, when the repo also holds public-but-unpublished ones (examples). Default: every public package. */
	packages?: string[]
}

export interface EnvironmentData {
	root: string
	workspace: string
	stackPath: string
	cwd: string
	env: ProcessEnv
}

export interface StackPackage {
	name: string
	version: string
	dir: string
}

/** Written by `build-stack`, read by `run-suites`. Paths are relative to the manifest. */
export interface TarballManifest {
	stack: Stack
	repo: string
	ref: string
	createdAt: string
	packages: Record<string, string>
}

export interface RunOptions {
	stack: Stack
	root: string
	workspace: string
	stackPath: string
	/** Resolved upstream overrides (package name -> spec) applied to every suite. */
	stackOverrides: Record<string, string>
	/** Upstream packages this suite exercises; checked after install, enforced by `coverage`. */
	covers?: string[]
	verify?: boolean
	skipGit?: boolean
	agent?: Agent
	/** Replaces the default `<pm> install` after overrides are applied. */
	install?: Task | Task[]
	beforeInstall?: Task | Task[]
	beforeBuild?: Task | Task[]
	build?: Task | Task[]
	beforeTest?: Task | Task[]
	test?: Task | Task[]
}

export interface RepoOptions {
	repo: string
	dir?: string
	branch?: string
	tag?: string
	commit?: string
	shallow?: boolean
	/** Extra suite-specific overrides, merged on top of the stack overrides. */
	overrides?: Overrides
}

export interface CommandOptions {
	stack: Stack
	repo?: string
	branch?: string
	tag?: string
	commit?: string
	release?: string
	verify?: boolean
	json?: boolean
	good?: string
}

export interface ProcessEnv {
	[key: string]: string | undefined
}
