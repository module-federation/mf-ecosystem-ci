import { createModuleFederationConfig } from '@module-federation/enhanced'

// Read by both `rspack build` (rspack.config.ts) and the `mf` CLI (`mf dts`).
export default createModuleFederationConfig({
	name: 'tooling_remote',
	filename: 'remoteEntry.js',
	exposes: {
		'./Button': './src/Button.tsx',
		'./schema': './src/schema.ts',
	},
	shared: {
		react: { singleton: true, requiredVersion: '18.3.1' },
		'react-dom': { singleton: true, requiredVersion: '18.3.1' },
	},
	dts: {
		// Ship the d.ts of react (via @types/react) and zod inside @mf-types.zip so a host
		// that installs neither can still typecheck against the exposed modules.
		generateTypes: { extractThirdParty: true },
		consumeTypes: false,
	},
})
