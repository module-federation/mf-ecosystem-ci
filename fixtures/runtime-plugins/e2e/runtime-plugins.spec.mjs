import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf-8');
const PRIMARY = 'http://127.0.0.1:4212';
const MIRROR = 'http://127.0.0.1:4211';

/** Load the host page once per test and wait until the federated import settled. */
async function loadHost(page) {
  await page.goto('/');
  await expect(page.locator('#out')).not.toHaveAttribute('data-state', 'pending', { timeout: 30_000 });
  await expect(page.locator('#out')).toHaveAttribute('data-state', 'loaded');
  await expect(page.locator('#out')).toHaveText('Hello rp_host, from rp_remote');
}

test.describe.configure({ mode: 'serial' });

test('retry-plugin rotates the dead primary CDN to the mirror for manifest and remoteEntry', async ({ page, request }) => {
  await loadHost(page);

  const requests = await (await request.get('/__requests')).json();
  const seen = (port, p) => requests.filter((r) => r.port === port && r.path === p).map((r) => r.search);
  // First attempt hits the configured (broken) entry, the retry goes to the next domain with retryCount.
  expect(seen(4212, '/mf-manifest.json')).toEqual(['']);
  expect(seen(4211, '/mf-manifest.json')).toEqual(['?retryCount=1']);
  expect(seen(4212, '/remoteEntry.js')).toEqual(['']);
  expect(seen(4211, '/remoteEntry.js')).toEqual(['?retryCount=1']);

  const log = await page.evaluate(() => window.__RETRY_LOG__);
  expect(log).toEqual([
    { event: 'retry', times: 1, url: `${MIRROR}/mf-manifest.json?retryCount=1`, tagName: 'fetch' },
    { event: 'success', url: `${MIRROR}/mf-manifest.json?retryCount=1`, tagName: 'fetch' },
    { event: 'retry', times: 1, url: `${MIRROR}/remoteEntry.js?retryCount=1`, tagName: 'script' },
    { event: 'success', url: `${MIRROR}/remoteEntry.js?retryCount=1`, tagName: 'script' },
  ]);
});

test('observability-plugin records the recovered remoteEntry failure and the successful load', async ({ page }) => {
  await loadHost(page);

  const reports = await page.evaluate(() => {
    const reader = window.__FEDERATION__?.__OBSERVABILITY__?.rp_host;
    if (!reader) throw new Error('observability browser reader rp_host is not installed');
    return reader.findReports({ remote: 'rp_remote' });
  });

  // Entry load: the first remoteEntry request failed (RUNTIME-008) and the retry plugin recovered it.
  const entry = reports.find((r) => r.requestId === 'rp_remote');
  expect(entry, JSON.stringify(reports.map((r) => r.requestId))).toBeTruthy();
  expect(entry.status).toBe('success');
  expect(entry.summary.outcome).toBe('recovered');
  expect(entry.summary.flags.recovered).toBe(true);
  expect(entry.summary.phases.manifest.status).toBe('success');
  expect(entry.summary.phases.remoteEntry).toMatchObject({ status: 'success', recovered: true });
  expect(entry.summary.error).toMatchObject({ errorCode: 'RUNTIME-008', failedPhase: 'remoteEntry', retryable: true });
  expect(entry.summary.error.context.url).toBe(`${PRIMARY}/remoteEntry.js`);

  // Module load: rp_remote/greeting went through every runtime stage.
  const mod = reports.find((r) => r.requestId === 'rp_remote/greeting');
  expect(mod).toBeTruthy();
  expect(mod.status).toBe('success');
  expect(mod.hostName).toBe('rp_host');
  expect(mod.summary.outcome).toBe('runtime-loaded');
  expect(mod.diagnosis.completedPhases).toEqual(
    expect.arrayContaining(['matchRemote', 'remoteEntryInit', 'expose', 'loadRemote']),
  );
  expect(mod.events.map((e) => e.message)).toEqual(
    expect.arrayContaining(['remote:matched', 'expose:resolved', 'remote:load-complete']),
  );

  // Build side: ObservabilityBuildPlugin wrote build-info.json for the host.
  const buildInfo = JSON.parse(read('host', '.mf', 'observability', 'build-info.json'));
  expect(buildInfo.schemaVersion).toBe(1);
  expect(buildInfo.bundler.name).toBe('webpack');
  expect(buildInfo.moduleFederation.name).toBe('rp_host');
  expect(buildInfo.moduleFederation.remotes).toHaveLength(1);
  expect(buildInfo.moduleFederation.remotes[0]).toMatchObject({
    alias: 'rp_remote',
    entry: `${PRIMARY}/mf-manifest.json`,
  });
});

// Known upstream bug (core c96da54): normalizeRemoteFromManifest prefers the manifest's
// `moduleName` (the consumed expose, "greeting") over `federationContainerName`, so the
// remote is recorded as "greeting". Like every known upstream bug here, this stays red
// until it is fixed; see AGENTS.md.
test('observability build-info names the remote by its container name', async () => {
  const buildInfo = JSON.parse(read('host', '.mf', 'observability', 'build-info.json'));
  expect(buildInfo.moduleFederation.remotes[0].name).toBe('rp_remote');
});

test('provideExternalRuntime injects the host runtime core that the externalRuntime remote runs on', async ({ page }) => {
  // Build output: the remote reads runtime-core from the global instead of bundling it,
  // and the host bundle carries the inject plugin added by the experiment switch.
  const remoteEntry = read('remote', 'dist', 'remoteEntry.js');
  expect(remoteEntry).toContain('self["_FEDERATION_RUNTIME_CORE"]');
  expect(remoteEntry).not.toMatch(/var ModuleFederation = class/);
  const hostMain = read('host', 'dist', 'main.js');
  expect(hostMain).toContain('@module-federation/inject-external-runtime-core-plugin');
  expect(hostMain).toMatch(/var ModuleFederation = class/);

  // Resolve the inject plugin the way enhanced does, to compare against its published version.
  const hostRequire = createRequire(path.join(root, 'host', 'package.json'));
  const enhancedRequire = createRequire(hostRequire.resolve('@module-federation/enhanced'));
  const injectEntry = enhancedRequire.resolve('@module-federation/inject-external-runtime-core-plugin');
  const injectVersion = JSON.parse(
    fs.readFileSync(path.join(path.dirname(injectEntry), '..', 'package.json'), 'utf-8'),
  ).version;

  await loadHost(page);
  const state = await page.evaluate(() => {
    const core = window._FEDERATION_RUNTIME_CORE;
    const remote = (window.__FEDERATION__?.__INSTANCES__ || []).find((i) => i.name === 'rp_remote');
    return {
      from: window._FEDERATION_RUNTIME_CORE_FROM,
      hasCore: typeof core?.ModuleFederation === 'function',
      remoteFound: Boolean(remote),
      remoteUsesInjectedCore: Boolean(remote && core && remote instanceof core.ModuleFederation),
    };
  });
  expect(state.from).toEqual({ name: 'rp_host', version: injectVersion });
  expect(state.hasCore).toBe(true);
  expect(state.remoteFound).toBe(true);
  // The remote has no runtime-core of its own; its federation instance was built from the injected class.
  expect(state.remoteUsesInjectedCore).toBe(true);
});
