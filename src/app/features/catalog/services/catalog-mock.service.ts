import { Injectable } from '@angular/core';
import { Product } from '../models/product.model';

export interface CatalogQuery {
  category?: string | null;           // 👈 opcional
  tags?: string[];
  min?: number;
  max?: number;
  sort?: 'popular' | 'price-asc' | 'price-desc' | 'new';
  page?: number;
  pageSize?: number;
}

export interface CatalogResult {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable({ providedIn: 'root' })
export class CatalogMockService {
  // ⚠️ Cambia paths por tus assets reales si ya los tienes
  private readonly DATA: Product[] = [
    { id: '1', slug: 'croquetas-premium-10kg', name: 'Croquetas Premium 10kg', price: 499, oldPrice: 560, image: 'assets/images/products/croquetas.jpg', badge: 'TOP', category: 'perros', tags: ['alimento'] },
    { id: '2', slug: 'arena-gato-12l', name: 'Arena para gato 12L', price: 189, image: 'assets/images/products/arena.jpg', badge: 'SALE', category: 'gatos', tags: ['higiene'] },
    { id: '3', slug: 'cuerda-mordedora', name: 'Cuerda mordedora', price: 59, image: 'assets/images/products/cuerda.jpg', badge: null, category: 'perros', tags: ['juguetes'] },
    { id: '4', slug: 'arnes-reflectivo', name: 'Arnés reflectivo', price: 129, image: 'assets/images/products/arnes.jpg', badge: 'NEW', category: 'perros', tags: ['accesorios'] },
    { id: '5', slug: 'shampoo-hipo', name: 'Shampoo hipoalergénico', price: 89, image: 'assets/images/products/shampoo.jpg', badge: null, category: 'perros', tags: ['higiene'] },
    { id: '6', slug: 'snacks-dentales-x7', name: 'Snacks dentales x7', price: 39, image: 'assets/images/products/snacks.jpg', badge: null, category: 'perros', tags: ['snacks'] },
    { id: '7', slug: 'cama-memory-foam', name: 'Cama memory foam', price: 399, oldPrice: 450, image: 'assets/images/products/cama.jpg', badge: 'TOP', category: 'perros', tags: ['accesorios'] },
    { id: '8', slug: 'comedero-doble', name: 'Comedero doble antidesliz', price: 119, image: 'assets/images/products/comedero.jpg', badge: null, category: 'perros', tags: ['accesorios'] },
    { id: '9', slug: 'pluma-laser', name: 'Pluma láser para gato', price: 49, image: 'assets/images/products/laser.jpg', badge: null, category: 'gatos', tags: ['juguetes'] },
    { id: '10', slug: 'rascador-compacto', name: 'Rascador compacto', price: 149, image: 'assets/images/products/rascador.jpg', badge: 'SALE', category: 'gatos', tags: ['accesorios'] },
    // duplica / varía para tener >12 y probar "Load more"
    { id: '11', slug: 'snack-salmon', name: 'Snack de salmón', price: 55, image: 'assets/images/products/snack-salmon.jpg', badge: null, category: 'gatos', tags: ['snacks'] },
    { id: '12', slug: 'shampoo-gato', name: 'Shampoo para gato', price: 75, image: 'assets/images/products/shampoo-gato.jpg', badge: null, category: 'gatos', tags: ['higiene'] },
    { id: '13', slug: 'cepillo-dientes', name: 'Cepillo dental', price: 35, image: 'assets/images/products/cepillo.jpg', badge: null, category: 'perros', tags: ['higiene'] },
    { id: '14', slug: 'pelota-eco', name: 'Pelota ecológica', price: 29, image: 'assets/images/products/pelota.jpg', badge: null, category: 'perros', tags: ['juguetes'] },
    { id: '15', slug: 'collar-ajustable', name: 'Collar ajustable', price: 69, image: 'assets/images/products/collar.jpg', badge: 'NEW', category: 'perros', tags: ['accesorios'] },
  ];

  search(q: CatalogQuery): Promise<CatalogResult> {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 12;
    const tags = (q.tags ?? []).map(t => t.toLowerCase());

    // 👇 Arrancamos con TODO
    let list = [...this.DATA];

    // 👇 Solo filtra por categoría si viene definida y no es 'all'
    if (q.category && q.category !== 'all') {
      list = list.filter(p => p.category === q.category);
    }

    if (tags.length) list = list.filter(p => tags.every(t => p.tags.map(x => x.toLowerCase()).includes(t)));
    if (q.min != null) list = list.filter(p => p.price >= q.min!);
    if (q.max != null) list = list.filter(p => p.price <= q.max!);

    switch (q.sort) {
      case 'price-asc':  list.sort((a,b)=>a.price-b.price); break;
      case 'price-desc': list.sort((a,b)=>b.price-a.price); break;
      case 'new':        list.sort((a,b)=>(b.badge==='NEW'?1:0)-(a.badge==='NEW'?1:0)); break;
      default:           list.sort((a,b)=>(b.badge==='TOP'?1:0)-(a.badge==='TOP'?1:0));
    }

    const total = list.length;
    const start = (page - 1) * pageSize;
    const items = list.slice(start, start + pageSize);

    return new Promise(res => setTimeout(() =>
      res({ items, total, page, pageSize }), 400));
  }
}
