import { expect, test } from '@playwright/test';

const MANIFEST = 'http://127.0.0.1:4221/mf-manifest.json';

/** Collect page errors and any request that leaves the fixture's own servers. */
function watch(page) {
  const errors = [];
  const external = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => {
    const url = new URL(r.url());
    if (/^https?:$/.test(url.protocol) && url.hostname !== '127.0.0.1') external.push(r.url());
  });
  return { errors, external };
}

test('devtools panel renders the live federation state of the page it is embedded in', async ({ page }) => {
  const seen = watch(page);
  await page.goto('/devtools.html');
  await expect(page.locator('#status')).toHaveAttribute('data-state', 'ready', { timeout: 30_000 });
  await expect(page.locator('#remote')).toContainText('dt_remote card: devtools host');

  const moduleIds = await page.evaluate(() => Object.keys(window.__FEDERATION__.moduleInfo).sort());
  expect(moduleIds).toEqual(['dt_host', `dt_remote:${MANIFEST}`]);

  const panel = page.locator('#devtools');
  const nav = (name) => panel.getByRole('button', { name, exact: true });
  const stat = (label) => panel.getByText(label, { exact: true }).locator('xpath=..');

  // Header stats come from separateType(__FEDERATION__.moduleInfo).
  await expect(panel).toContainText('MF devtools fixture');
  await expect(stat('Modules')).toHaveText(/^\s*2\s*Modules\s*$/);
  await expect(stat('Remotes')).toHaveText(/^\s*1\s*Remotes\s*$/);
  await expect(stat('Consumers')).toHaveText(/^\s*1\s*Consumers\s*$/);

  // Default Proxy tab lists the remote that can be overridden.
  await expect(panel).toContainText('Remotes in scope');
  await expect(panel.getByText('dt_remote', { exact: true }).first()).toBeVisible();

  // Module info: the consumer and its resolved remote entry.
  await nav('Module info').click();
  await expect(panel).toContainText('dt_host');
  await expect(panel).toContainText('Consumer');
  await expect(panel.getByRole('row').filter({ hasText: 'dt_remote' })).toContainText(MANIFEST);

  // Dependency graph: host -> remote, with the remote's expose, shared deps and entry from its snapshot.
  await nav('Dependency graph').click();
  await expect(panel).toContainText(/2\s*nodes rendered/);
  for (const text of ['./Card', 'react:19.1.1', 'react-dom:19.1.1', MANIFEST]) {
    await expect(panel).toContainText(text);
  }

  // Shared: react was provided by the host's share scope and reused by the remote.
  await nav('Shared').click();
  await expect(panel).toContainText('react@19.1.1');
  await expect(panel).toContainText(/Provider:\s*dt_host/);

  expect(seen.errors).toEqual([]);
  expect(seen.external).toEqual([]);
});

test('playground runs its sandbox against a local remote and renders the federated component', async ({ page }) => {
  const seen = watch(page);
  const requests = [];
  page.on('request', (r) => requests.push(r.url()));
  await page.goto('/playground.html');

  // Run Sandbox (autoRun) fetched the manifest and derived the remote name and expose.
  await expect(page.getByText('Remote: dt_remote')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText('Sandbox bundle compiled. Preview is running.')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText('Target: dt_remote/Card')).toBeVisible();

  // The preview iframe compiled the generated app.tsx/mf.ts in-browser, created an MF
  // instance from the runtime at runtimeModuleUrl, and rendered dt_remote/Card.
  const preview = page.frameLocator('iframe[title="Sandbox Preview"]');
  await expect(preview.getByTestId('dt-remote-card')).toContainText('dt_remote card: Module Federation Playground', {
    timeout: 30_000,
  });
  // Hooks only work if the remote resolved the host's React through the share scope.
  await preview.getByRole('button', { name: 'clicked 0' }).click();
  await expect(preview.getByRole('button', { name: 'clicked 1' })).toBeVisible();

  expect(requests).toContain(MANIFEST);
  expect(requests).toContain('http://127.0.0.1:4221/remoteEntry.js');
  expect(requests).toContain('http://127.0.0.1:4220/static/js/mf-runtime.js');
  expect(seen.errors).toEqual([]);
  expect(seen.external).toEqual([]);
});
