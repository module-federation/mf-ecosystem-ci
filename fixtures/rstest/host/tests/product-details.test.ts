import { expect, it } from '@rstest/core'
import { loadProductDetails } from '../src/load-product-details'

it('dynamically imports a function from the HTTP remote and calls it', async () => {
  await expect(loadProductDetails('AE-1843')).resolves.toBe('SKU AE-1843 is served by the HTTP remote.')
})

it('resolves catalog/* through the federation runtime from the HTTP remote entry', async () => {
  await loadProductDetails('warmup')
  const federation = (globalThis as any).__FEDERATION__
  const host = federation.__INSTANCES__.find((i: any) => i.name === 'rstest_fixture_host')
  expect(host).toBeTruthy()
  expect(host.options.remotes).toContainEqual(
    expect.objectContaining({
      name: 'rstest_fixture_catalog',
      alias: 'catalog',
      entry: 'http://127.0.0.1:4420/remoteEntry.cjs',
    }),
  )
})
