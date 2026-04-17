import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { StorefrontCatalogTaxonomyAnimal, StorefrontMedia, StorefrontProduct } from '../core/models/storefront.models';
import { StorefrontApiService } from '../core/services/storefront-api.service';
import { Category, Product } from './home.models';

@Injectable()
export class HomeDataService {
  private readonly categories$ = this.storefrontApi.getCatalogTaxonomy().pipe(
    map((response) => (response.data?.animals || []).slice(0, 6).map((item, index) => this.toHomeCategory(item, index))),
    catchError(() => of([])),
    shareReplay({ bufferSize: 1, refCount: false })
  );
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

  private toHomeCategory(item: StorefrontCatalogTaxonomyAnimal, index: number): Category {
    return {
      id: index + 1,
      name: item.label || `Mascota ${index + 1}`,
      slug: item.slug || item.key || '',
      image: this.resolveCategoryImage(item.image),
    };
  }

  private toFeaturedProduct(item: StorefrontProduct): Product {
    const price = Number(item.price || 0);
    const compareAt = item.compareAtPrice ? Number(item.compareAtPrice) : undefined;
    return {
      id: Number(item.id),
      name: item.name,
      slug: item.slug,
      price,
      oldPrice: compareAt && compareAt > price ? compareAt : undefined,
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

  private resolveCategoryImage(media?: StorefrontMedia | null): string {
    const url =
      media?.formats?.['medium']?.url ||
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
