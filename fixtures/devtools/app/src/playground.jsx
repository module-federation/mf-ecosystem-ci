import { createRoot } from 'react-dom/client';
import { ModuleFederationPlayground } from '@module-federation/playground';

// Every URL points at this fixture's servers, so the sandbox never touches a CDN.
createRoot(document.getElementById('root')).render(
  <ModuleFederationPlayground
    autoRun
    defaultManifestUrl="http://127.0.0.1:4221/mf-manifest.json"
    defaultExpose="./Card"
    runtimeModuleUrl="http://127.0.0.1:4220/static/js/mf-runtime.js"
    monacoVsUrl="http://127.0.0.1:4220/monaco/vs"
  />,
);
