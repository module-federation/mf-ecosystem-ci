import type {FederationRuntimePlugin} from '@module-federation/runtime';

export default function (): FederationRuntimePlugin {
  return {
    name: 'mf-fixture-host-runtime-plugin',
    beforeLoadShare(args) {
      return args;
    },
  };
}
