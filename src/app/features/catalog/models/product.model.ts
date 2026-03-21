export type Badge = 'TOP' | 'SALE' | 'NEW' | null;

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
}
