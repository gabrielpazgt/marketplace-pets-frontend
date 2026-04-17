export type Badge = 'TOP' | 'SALE' | 'NEW' | null;

export interface ProductVariantRef {
  id: string;
  label: string;
  price: number;
  compareAtPrice?: number;
  stock?: number | null;
}

export interface Product {
  id: string;
  documentId?: string;
  slug: string;
  name: string;
  price: number;
  oldPrice?: number;
  image: string;
  badge: Badge;
  category: string;
  subcategory?: string;
  tags: string[];
  stock?: number;
  variants?: ProductVariantRef[];
}
