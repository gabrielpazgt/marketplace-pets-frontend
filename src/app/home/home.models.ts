export interface Category {
  id: number;
  name: string;
  slug: string;
  image: string;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  oldPrice?: number;
  image: string;
  badge?: 'NEW' | 'SALE' | 'TOP';
}
