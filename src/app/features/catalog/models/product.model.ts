export type Badge = 'TOP' | 'SALE' | 'NEW' | null;

export interface Product {
  id: string;
  slug: string;          // slug del producto
  name: string;
  price: number;
  oldPrice?: number;
  image: string;         // path asset
  badge: Badge;
  category: string;      // slug de categoría (/c/:slug)
  tags: string[];        // para filtros rápidos (higiene, snacks, etc)
}
