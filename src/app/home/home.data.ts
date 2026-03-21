import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { StorefrontProduct } from '../core/models/storefront.models';
import { StorefrontApiService } from '../core/services/storefront-api.service';
import { Category, Product } from './home.models';

@Injectable()
export class HomeDataService {
  private readonly categories: Category[] = [
    { id: 1, name: 'Perros', slug: 'perros', image: 'assets/images/categories/dogs.png' },
    { id: 2, name: 'Gatos', slug: 'gatos', image: 'assets/images/categories/cats.png' },
    { id: 3, name: 'Higiene', slug: 'higiene', image: 'assets/images/categories/bath.png' },
    { id: 4, name: 'Snacks', slug: 'snacks', image: 'assets/images/categories/snacks.png' },
    { id: 5, name: 'Juguetes', slug: 'juguetes', image: 'assets/images/categories/toys.png' },
    { id: 6, name: 'Accesorios', slug: 'accesorios', image: 'assets/images/categories/accesories.png' },
  ];

  private readonly categories$ = of(this.categories);
  private readonly featured$ = this.storefrontApi
    .listProducts({ page: 1, pageSize: 8, sort: 'createdAt:desc', inStock: true, compact: true })
    .pipe(
      map((response) => (response.data || []).map((item) => this.toFeaturedProduct(item))),
      catchError(() => of([])),
      shareReplay({ bufferSize: 1, refCount: false })
    );

  constructor(private storefrontApi: StorefrontApiService) {}

  getCategories(): Observable<Category[]> {
    return this.categories$;
  }

  getFeatured(): Observable<Product[]> {
    return this.featured$;
  }

  private toFeaturedProduct(item: StorefrontProduct): Product {
    return {
      id: Number(item.id),
      name: item.name,
      slug: item.slug,
      price: Number(item.price || 0),
      image: this.resolveProductImage(item),
      badge: this.resolveBadge(item),
    };
  }

  private resolveProductImage(item: StorefrontProduct): string {
    const media = (item.images || [])[0];
    const url =
      media?.formats?.['small']?.url ||
      media?.formats?.['thumbnail']?.url ||
      media?.url ||
      '';

    return this.storefrontApi.resolveMediaUrl(url) || 'assets/images/products/placeholder.png';
  }

  private resolveBadge(item: StorefrontProduct): Product['badge'] {
    if ((item.stock ?? 0) <= 5 && (item.stock ?? 0) > 0) return 'TOP';
    return undefined;
  }
}
