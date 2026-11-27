import { createModuleFederationConfig } from '@module-federation/sdk'

// Only read by the standalone `mf` CLI; this host has no bundler of its own.
export default createModuleFederationConfig({
	name: 'tooling_host',
	remotes: {
		// Served from ../remote/dist by scripts/fetch-types.mjs (ecosystem-ci port range 4500-4599).
		remote: 'tooling_remote@http://localhost:4581/remoteEntry.js',
	},
	dts: {
		generateTypes: false,
		consumeTypes: { consumeAPITypes: true },
	},
})
