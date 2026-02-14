export interface CartItem {
  id: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  oldPrice?: number;
  qty: number;
  stock: number;
  attrs?: string[];           // p.e. ['Talla M', 'Azul']
}
