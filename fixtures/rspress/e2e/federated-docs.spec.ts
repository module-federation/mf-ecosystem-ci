import { expect, test } from '@playwright/test'

test('consumer docs hydrate the federated fragment from the provider', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  const providerRequests: string[] = []
  page.on('request', (r) => {
    if (r.url().startsWith('http://localhost:4410/')) providerRequests.push(new URL(r.url()).pathname)
  })

  await page.goto('/')
  await expect(page.locator('h1').first()).toHaveText(/Consumer home/)
  const fragment = page.getByText('Federated fragment from docs_provider rendered for docs_consumer')
  await expect(fragment).toBeVisible()

  // The browser loads the remote from the provider at runtime, then keeps rendering it.
  await expect.poll(() => providerRequests).toContain('/mf-manifest.json')
  await expect.poll(() => providerRequests).toContain('/remoteEntry.js')
  await page.waitForLoadState('networkidle')
  await expect(fragment).toBeVisible()

  // The fragment is interactive React from the remote, so hydration must have succeeded.
  const button = page.locator('#provider-counter')
  await expect(button).toHaveText('clicked 0')
  await button.click()
  await expect(button).toHaveText('clicked 1')

  expect(errors).toEqual([])
})
