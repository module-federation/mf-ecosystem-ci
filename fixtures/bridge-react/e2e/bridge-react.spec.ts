import { expect, test, type Page } from '@playwright/test';

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  return errors;
}

test('remote runs standalone with its own BrowserRouter', async ({ page }) => {
  await page.goto('http://localhost:4102/');
  await expect(page.getByRole('heading', { name: 'Remote1 home page' })).toBeVisible();
  await expect(page.getByTestId('remote-props')).toHaveText('name: standalone, age: 0');
  await expect(page.getByTestId('remote-detail-link')).toHaveAttribute('href', '/detail');
});

test('host renders the remote app through createRemoteAppComponent / createBridgeComponent', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Host home page' })).toBeVisible();

  await page.getByTestId('host-remote1-link').click();
  await expect(page).toHaveURL(/\/remote1$/);
  const slot = page.getByTestId('remote1-slot');
  await expect(slot.getByRole('heading', { name: 'Remote1 home page' })).toBeVisible();
  // Props cross the bridge.
  await expect(slot.getByTestId('remote-props')).toHaveText('name: Ming, age: 12');
  expect(errors).toEqual([]);
});

test('remote routes under the host basename (aliased BrowserRouter)', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/remote1');
  const slot = page.getByTestId('remote1-slot');
  await expect(slot.getByRole('heading', { name: 'Remote1 home page' })).toBeVisible();

  // The remote declares <BrowserRouter> without a basename. Only the bridge router
  // (react-router-dom aliased by bridge-react-webpack-plugin) can prefix it with /remote1.
  const detailLink = slot.getByTestId('remote-detail-link');
  await expect(detailLink).toHaveAttribute('href', '/remote1/detail');
  await detailLink.click();
  await expect(page).toHaveURL(/\/remote1\/detail$/);
  await expect(slot.getByRole('heading', { name: 'Remote1 detail page' })).toBeVisible();
  // The host shell stays mounted.
  await expect(page.getByRole('heading', { name: 'Bridge React host' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('host navigation is synced into the remote router', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/remote1');
  const slot = page.getByTestId('remote1-slot');
  await expect(slot.getByRole('heading', { name: 'Remote1 home page' })).toBeVisible();

  // Host <Link>s change the URL; the bridge dispatches popstate so the remote router follows.
  await page.getByTestId('host-remote1-detail-link').click();
  await expect(page).toHaveURL(/\/remote1\/detail$/);
  await expect(slot.getByRole('heading', { name: 'Remote1 detail page' })).toBeVisible();
  await page.getByTestId('host-remote1-link').click();
  await expect(page).toHaveURL(/\/remote1$/);
  await expect(slot.getByRole('heading', { name: 'Remote1 home page' })).toBeVisible();

  // Leaving the route unmounts the remote app.
  await page.getByTestId('host-home-link').click();
  await expect(page.getByRole('heading', { name: 'Host home page' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Remote1 home page' })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('deep link into a remote sub-route', async ({ page }) => {
  await page.goto('/remote1/detail');
  await expect(
    page.getByTestId('remote1-slot').getByRole('heading', { name: 'Remote1 detail page' }),
  ).toBeVisible();
});

test('memoryRoute swaps the remote BrowserRouter for a MemoryRouter', async ({ page }) => {
  await page.goto('/memory');
  const slot = page.getByTestId('memory-slot');
  await expect(slot.getByRole('heading', { name: 'Remote1 detail page' })).toBeVisible();
  await slot.getByTestId('remote-home-link').click();
  await expect(slot.getByRole('heading', { name: 'Remote1 home page' })).toBeVisible();
  await expect(slot.getByTestId('remote-props')).toHaveText('name: Memory, age: 1');
  // Memory routing never touches the browser URL.
  await expect(page).toHaveURL(/\/memory$/);
});
