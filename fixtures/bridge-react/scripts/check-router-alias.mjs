// bridge-react-webpack-plugin (applied by the MF rspack plugin when an app depends on
// @module-federation/bridge-react) aliases `react-router-dom$` to bridge-react's
// router-v6 wrapper. Its BrowserRouter logs "WraperRouter info >>>", a string that only
// exists in bridge-react/dist/router-v*.js, so finding it in a bundle proves the alias ran.
import fs from 'node:fs';
import path from 'node:path';

const marker = 'WraperRouter info >>>';

function bundleContains(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true, recursive: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.js')) continue;
    const file = path.join(entry.parentPath, entry.name);
    if (fs.readFileSync(file, 'utf-8').includes(marker)) return file;
  }
  return undefined;
}

let failed = false;
for (const app of ['remote', 'host']) {
  const dist = path.resolve(app, 'dist');
  const hit = bundleContains(dist);
  if (hit) {
    console.log(`[bridge-alias] ${app}: react-router-dom aliased to bridge-react router (${path.relative(process.cwd(), hit)})`);
  } else {
    console.error(`[bridge-alias] ${app}: no bridge-react router wrapper in ${dist}; bridge-react-webpack-plugin did not alias react-router-dom`);
    failed = true;
  }
}
if (failed) process.exit(1);
