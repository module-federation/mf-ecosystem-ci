import { expect, test } from '@playwright/test'

test('host renders the esbuild remote through module federation', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  const remoteRequests: string[] = []
  page.on('request', (r) => {
    if (r.url().startsWith('http://localhost:4401/')) remoteRequests.push(r.url())
  })

  await page.goto('/')

  await expect(page.locator('#host-title')).toHaveText('esbuild host')
  // Rendered by the remote, loaded at runtime from the remote server.
  await expect(page.locator('#remote-widget h2')).toHaveText('Remote widget')
  await expect(page.locator('#remote-value')).toHaveText('exported from the esbuild remote')
  await expect(page.locator('#remote-hooks')).toHaveText('hooks work')
  // react is a shared singleton: the remote sees the host's React instance.
  await expect(page.locator('#remote-react')).toHaveText('react singleton')
  await expect(page.locator('#remote-react-version')).toHaveText('18.3.1')

  expect(remoteRequests).toContain('http://localhost:4401/remoteEntry.js')

  // The federation runtime registered one react provider (the host's) that both containers use.
  const share = await page.evaluate(() => {
    const f = (globalThis as any).__FEDERATION__
    const react = f.__SHARE__?.host?.default?.react ?? {}
    return {
      instances: f.__INSTANCES__.map((i: any) => i.name),
      providers: Object.values(react).map((s: any) => ({
        from: s.from,
        useIn: s.useIn,
        loaded: !!s.loaded,
        singleton: s.shareConfig?.singleton,
      })),
    }
  })
  expect(share.instances).toEqual(expect.arrayContaining(['host', 'remote']))
  expect(share.providers).toHaveLength(1)
  expect(share.providers[0]).toMatchObject({ from: 'host', loaded: true, singleton: true })
  expect(share.providers[0].useIn).toEqual(expect.arrayContaining(['host', 'remote']))
  expect(errors).toEqual([])
})
