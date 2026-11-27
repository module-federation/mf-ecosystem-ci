export const loadProductDetails = async (sku: string): Promise<string> => {
  const { default: getProductDetails } = await import('catalog/product-details')
  return getProductDetails(sku)
}
