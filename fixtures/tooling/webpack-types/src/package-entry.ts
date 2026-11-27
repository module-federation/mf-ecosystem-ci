// The package's own entry (exports["."] -> types.d.ts), imported by name.
import type { Configuration, container } from '@module-federation/webpack-type'

export type FederationPlugin = InstanceType<typeof container.ModuleFederationPlugin>
export const config: Configuration = { mode: 'production', target: 'web' }
