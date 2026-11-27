import './chrome-shim.js';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { createRoot } from 'react-dom/client';
import { createInstance } from '@module-federation/runtime';
import DevtoolsApp from '@module-federation/devtools';

const status = document.getElementById('status');

async function main() {
  // A real consumer: load the remote through the MF runtime so `__FEDERATION__`
  // holds genuine moduleInfo / share data for the devtools panel to read.
  const mf = createInstance({
    name: 'dt_host',
    remotes: [{ name: 'dt_remote', entry: 'http://127.0.0.1:4221/mf-manifest.json' }],
    shared: {
      react: {
        version: React.version,
        lib: () => React,
        shareConfig: { singleton: true, requiredVersion: '^19.0.0' },
      },
      'react-dom': {
        version: React.version,
        lib: () => ReactDOM,
        shareConfig: { singleton: true, requiredVersion: '^19.0.0' },
      },
    },
  });
  const { default: Card } = await mf.loadRemote('dt_remote/Card');

  createRoot(document.getElementById('remote')).render(<Card title="devtools host" />);
  createRoot(document.getElementById('devtools')).render(<DevtoolsApp />);
  status.dataset.state = 'ready';
}

main().catch((error) => {
  status.dataset.state = 'error';
  status.textContent = String(error?.stack || error);
});
