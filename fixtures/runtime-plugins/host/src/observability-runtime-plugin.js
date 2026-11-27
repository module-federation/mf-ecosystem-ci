import { ObservabilityPlugin } from '@module-federation/observability-plugin';

export default function observabilityRuntimePlugin() {
  return ObservabilityPlugin({
    level: 'verbose',
    browser: { enabled: true, scope: 'rp_host' },
  });
}
