import { expect, test, type Page } from '@playwright/test';

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

test('remote runs standalone with its own router', async ({ page }) => {
  await page.goto('http://localhost:4112/');
  await expect(page.getByRole('heading', { name: 'Remote3 home page' })).toBeVisible();
  await expect(page.getByTestId('remote-greeting')).toHaveText('greeting: none');
  await expect(page.getByTestId('remote-detail-link')).toHaveAttribute('href', '/detail');
});

test('host renders the remote app through createRemoteAppComponent / createBridgeComponent', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Host home page' })).toBeVisible();

  await page.getByTestId('host-remote-link').click();
  await expect(page).toHaveURL(/\/remote$/);
  const slot = page.getByTestId('remote-slot');
  await expect(slot.getByRole('heading', { name: 'Remote3 home page' })).toBeVisible();
  // Attrs passed to the remote component become root props of the remote Vue app.
  await expect(slot.getByTestId('remote-greeting')).toHaveText('greeting: hello from host');
  expect(errors).toEqual([]);
});

test('remote router runs under the host-derived basename', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/remote');
  const slot = page.getByTestId('remote-slot');
  await expect(slot.getByRole('heading', { name: 'Remote3 home page' })).toBeVisible();

  // The remote router is created with createWebHistory() (no base); the bridge rebuilds it
  // with basename /remote, derived from the host route.
  const detailLink = slot.getByTestId('remote-detail-link');
  await expect(detailLink).toHaveAttribute('href', '/remote/detail');
  await detailLink.click();
  await expect(page).toHaveURL(/\/remote\/detail$/);
  await expect(slot.getByRole('heading', { name: 'Remote3 detail page' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Bridge Vue3 host' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('first host navigation after mount is synced into the remote router', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/remote');
  const slot = page.getByTestId('remote-slot');
  await expect(slot.getByRole('heading', { name: 'Remote3 home page' })).toBeVisible();

  // bridge-vue3 watches the host route and dispatches popstate (bridge-shared) so the remote
  // router follows. The React bridge does this from the first navigation on; so must Vue.
  await page.getByTestId('host-remote-detail-link').click();
  await expect(page).toHaveURL(/\/remote\/detail$/);
  await expect(slot.getByRole('heading', { name: 'Remote3 detail page' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('later host navigations are synced into the remote router', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/remote');
  const slot = page.getByTestId('remote-slot');
  await expect(slot.getByRole('heading', { name: 'Remote3 home page' })).toBeVisible();
  // Prime the bridge's route watcher (see the test above), then check both directions.
  await page.getByTestId('host-remote-detail-link').click();
  await expect(page).toHaveURL(/\/remote\/detail$/);

  await page.getByTestId('host-remote-link').click();
  await expect(page).toHaveURL(/\/remote\/?$/);
  await expect(slot.getByRole('heading', { name: 'Remote3 home page' })).toBeVisible();
  await page.getByTestId('host-remote-detail-link').click();
  await expect(page).toHaveURL(/\/remote\/detail$/);
  await expect(slot.getByRole('heading', { name: 'Remote3 detail page' })).toBeVisible();

  // Leaving the route destroys the remote app.
  await page.getByTestId('host-home-link').click();
  await expect(page.getByRole('heading', { name: 'Host home page' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Remote3/ })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('bridge-shared dispatchPopstateEnv syncs host and remote after an out-of-router URL change', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/remote/detail');
  const slot = page.getByTestId('remote-slot');
  await expect(slot.getByRole('heading', { name: 'Remote3 detail page' })).toBeVisible();
  await expect(page.getByTestId('host-route')).toHaveText('/remote/detail');

  await page.getByTestId('host-popstate-button').click();
  // The remote router (base /remote) normalises its root to /remote/.
  await expect(page).toHaveURL(/\/remote\/?$/);
  await expect(page.getByTestId('host-route')).toHaveText(/^\/remote\/?$/);
  await expect(slot.getByRole('heading', { name: 'Remote3 home page' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('memoryRoute keeps the remote router off the browser URL', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/memory');
  const slot = page.getByTestId('memory-slot');
  await expect(slot.getByRole('heading', { name: 'Remote3 detail page' })).toBeVisible();
  await slot.getByTestId('remote-home-link').click();
  await expect(slot.getByRole('heading', { name: 'Remote3 home page' })).toBeVisible();
  await expect(page).toHaveURL(/\/memory$/);
  expect(errors).toEqual([]);
});
