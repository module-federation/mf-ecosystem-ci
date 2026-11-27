declare module 'catalog/ProductPanel' {
  const ProductPanel: () => JSX.Element
  export default ProductPanel
}
declare module 'catalog/product-details' {
  export default function getProductDetails(sku: string): string
}
declare module 'profile/ProfileCard' {
  const ProfileCard: () => JSX.Element
  export default ProfileCard
}
