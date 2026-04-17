import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap, timeout } from 'rxjs/operators';
import { AppHttpError } from '../../../core/models/http.models';
import {
  StorefrontMedia,
  StorefrontProduct,
  StorefrontProductFacets,
  StorefrontProductsQuery,
} from '../../../core/models/storefront.models';
import { StorefrontApiService } from '../../../core/services/storefront-api.service';
import { Product } from '../models/product.model';

export type CatalogCollectionTag = 'new' | 'clearance';

export interface CatalogQuery {
  animalKey?: string;
  categorySlug?: string;
  category?: string | null;
  subcategory?: string | null;
  allowedSubcategories?: string[];
  collectionTag?: CatalogCollectionTag | null;
  search?: string;
  min?: number;
  max?: number;
  sort?: 'popular' | 'price-asc' | 'price-desc' | 'new';
  page?: number;
  pageSize?: number;
  inStock?: boolean;
  strictPet?: boolean;
  excludedTerms?: string[];
  forms?: string[];
  proteinSources?: string[];
  brandIds?: number[];
  specieIds?: number[];
  lifeStageIds?: number[];
  dietTagIds?: number[];
  healthConditionIds?: number[];
  ingredientIds?: number[];
}

export interface CatalogResult {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly clientFetchPageSize = 100;
  private readonly maxClientFetchPages = 50;
  private readonly requestTimeoutMs = 8000;
  private readonly newArrivalsLimit = 20;
  private readonly clearanceThresholdPct = 45;
  private facetsEndpointUnavailable = false;
  private readonly searchAliases: Record<string, string[]> = {
    alimento: ['alimentacion', 'comida', 'food', 'croquetas'],
    alimentacion: ['alimento', 'comida', 'food'],
    comida: ['alimento', 'alimentacion', 'food', 'croquetas'],
    food: ['alimento', 'alimentacion', 'comida'],
    treats: ['snack', 'snacks', 'premio', 'premios'],
    snack: ['treats', 'snacks', 'premio', 'premios'],
    snacks: ['treats', 'snack', 'premio', 'premios'],
    premio: ['premios', 'snack', 'snacks', 'treats'],
    premios: ['premio', 'snack', 'snacks', 'treats'],
    higiene: ['aseo', 'grooming', 'limpieza', 'hygiene'],
    aseo: ['higiene', 'grooming', 'limpieza', 'hygiene'],
    grooming: ['higiene', 'aseo', 'limpieza'],
    salud: ['health', 'farmacia'],
    health: ['salud', 'farmacia'],
    farmacia: ['salud', 'health'],
    ropa: ['zapatos', 'calzado'],
    zapatos: ['zapato', 'calzado', 'ropa'],
    calzado: ['zapatos', 'ropa'],
    perro: ['perros', 'dog', 'dogs'],
    perros: ['perro', 'dog', 'dogs'],
    gato: ['gatos', 'cat', 'cats'],
    gatos: ['gato', 'cat', 'cats'],
    pez: ['peces', 'fish', 'acuario'],
    peces: ['pez', 'fish', 'acuario'],
    acuario: ['pez', 'peces', 'fish'],
  };

  private readonly categorySlugMap: Record<string, string> = {
    food: 'food',
    perros: 'food',
    gatos: 'food',
    alimentacion: 'food',
    comida: 'food',
    treats: 'treats',
    higiene: 'hygiene',
    aseo: 'hygiene',
    grooming: 'hygiene',
    health: 'health',
    salud: 'health',
    farmacia: 'health',
    'cuidado-rutinario': 'health',
    snacks: 'treats',
    juguetes: 'accesories',
    descanso: 'accesories',
    suministros: 'accesories',
    ropa: 'accesories',
    accesorios: 'accesories',
    accesories: 'accesories',
    accessories: 'accesories',
    other: 'other',
    otros: 'other',
    todos: '',
    all: '',
  };

  private readonly emptyFacets: StorefrontProductFacets = {
    categories: [],
    subcategories: [],
    brands: [],
    forms: [],
    proteinSources: [],
    species: [],
    lifeStages: [],
    dietTags: [],
    healthConditions: [],
    ingredients: [],
    priceRange: { min: 0, max: 0 },
    totalProducts: 0,
  };

  constructor(private storefrontApi: StorefrontApiService) {}

  search(query: CatalogQuery): Observable<CatalogResult> {
    return this.searchInternal(query, false);
  }

  searchByPetProfile(petProfileId: number, query: CatalogQuery = {}): Observable<CatalogResult> {
    return this.searchInternal(query, true, petProfileId);
  }

  getFacets(query: CatalogQuery = {}, petProfileId?: number): Observable<StorefrontProductFacets> {
    const allowedSubcategories = this.normalizeAllowedSubcategories(query.allowedSubcategories || []);
    const collectionTag = this.normalizeCollectionTag(query.collectionTag);
    const normalizedSearch = this.normalizeSearch(query.search);
    const blockedTerms = this.buildExcludedTerms(query.excludedTerms || []);
    const requiresLocalFacetComputation =
      allowedSubcategories.length > 0 ||
      Boolean(collectionTag) ||
      normalizedSearch.length > 0 ||
      blockedTerms.length > 0;

    if (requiresLocalFacetComputation) {
      const storefrontQuery = this.buildStorefrontQuery(
        {
          ...query,
          allowedSubcategories: [],
          search: undefined,
          page: 1,
          pageSize: this.clientFetchPageSize,
        },
        petProfileId,
        false
      );

      return this.fetchAllPages(storefrontQuery, Boolean(petProfileId && petProfileId > 0)).pipe(
        map((response) => {
          const filteredProducts = this.applyClientFiltering(
            response.items || [],
            query,
            blockedTerms,
            allowedSubcategories,
            collectionTag,
            normalizedSearch
          );
          const filteredIds = new Set(filteredProducts.map((item) => Number(item.id)));
          const filteredStorefront = (response.items || []).filter((item) => filteredIds.has(Number(item.id)));

          return this.buildFacetsFromStorefrontProducts(filteredStorefront);
        }),
        catchError(() => of(this.emptyFacets))
      );
    }

    if (this.facetsEndpointUnavailable) {
      return of(this.emptyFacets);
    }

    const storefrontQuery = this.buildStorefrontQuery(query, petProfileId);
    const request$ = petProfileId && petProfileId > 0
      ? this.storefrontApi.listMyProductFacets(storefrontQuery)
      : this.storefrontApi.listProductFacets(storefrontQuery);

    return request$.pipe(
      timeout(this.requestTimeoutMs),
      map((response) => response.data || this.emptyFacets),
      catchError((error: AppHttpError) => {
        if (error?.status === 404) {
          this.facetsEndpointUnavailable = true;
        }

        return of(this.emptyFacets);
      })
    );
  }

  private searchInternal(query: CatalogQuery, useMyProducts: boolean, petProfileId?: number): Observable<CatalogResult> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.max(1, query.pageSize ?? 12);
    const normalizedSearch = this.normalizeSearch(query.search);
    const blockedTerms = this.buildExcludedTerms(query.excludedTerms || []);
    const allowedSubcategories = this.normalizeAllowedSubcategories(query.allowedSubcategories || []);
    const collectionTag = this.normalizeCollectionTag(query.collectionTag);
    const searchDrivenFiltering = normalizedSearch.length > 0;
    const requiresRichProductData =
      blockedTerms.length > 0 ||
      allowedSubcategories.length > 0 ||
      Boolean(collectionTag) ||
      searchDrivenFiltering;
    const useClientFiltering = requiresRichProductData;
    const useSearchRanking = normalizedSearch.length > 0;

    const storefrontQuery = this.buildStorefrontQuery(
      {
        ...query,
        search: useSearchRanking ? undefined : normalizedSearch,
        page: useClientFiltering ? 1 : page,
        pageSize: useClientFiltering ? this.clientFetchPageSize : pageSize,
      },
      useMyProducts ? petProfileId : undefined,
      !requiresRichProductData
    );

    const source$ = useClientFiltering
      ? this.fetchAllPages(storefrontQuery, useMyProducts)
      : this.fetchSinglePage(storefrontQuery, useMyProducts);

    return source$.pipe(
      map((source) => {
        const resolved = this.applyClientFiltering(
          source.items || [],
          query,
          blockedTerms,
          allowedSubcategories,
          collectionTag,
          normalizedSearch
        );

        if (!useClientFiltering) {
          return {
            items: resolved,
            total: source.total,
            page: source.page,
            pageSize: source.pageSize,
          };
        }

        const start = (page - 1) * pageSize;
        return {
          items: resolved.slice(start, start + pageSize),
          total: resolved.length,
          page,
          pageSize,
        };
      })
    );
  }

  private applyClientFiltering(
    items: StorefrontProduct[],
    query: CatalogQuery,
    blockedTerms: string[],
    allowedSubcategories: string[],
    collectionTag: CatalogCollectionTag | null,
    normalizedSearch: string
  ): Product[] {
    const collectionFilteredStorefront = this.filterStorefrontProductsByCollectionTag(items || [], collectionTag);
    const baseItems = collectionFilteredStorefront.map((item) => this.toUiProduct(item));
    const withoutAllergyConflicts = this.excludeByAllergyTerms(baseItems, blockedTerms);
    const subcategoryFiltered = this.filterByAllowedSubcategories(withoutAllergyConflicts, allowedSubcategories);
    const priceFiltered = this.applyLocalPriceFilter(subcategoryFiltered, query.min, query.max);

    if (!normalizedSearch) {
      return this.sortPlain(priceFiltered, query.sort, collectionTag);
    }

    const scored = this.rankBySearch(priceFiltered, normalizedSearch);
    return this.sortScored(scored, query.sort, collectionTag).map((entry) => entry.item);
  }

  private buildStorefrontQuery(
    query: CatalogQuery,
    petProfileId?: number,
    compact = false
  ): StorefrontProductsQuery {
    const normalizedCategory = this.normalizeCategory(query.category);
    const forms = this.normalizeTextList(query.forms);
    const proteinSources = this.normalizeTextList(query.proteinSources);
    const brandIds = (query.brandIds || []).filter((value) => Number(value) > 0);
    const specieIds = (query.specieIds || []).filter((value) => Number(value) > 0);
    const lifeStageIds = (query.lifeStageIds || []).filter((value) => Number(value) > 0);

    const storefrontQuery: StorefrontProductsQuery = {
      page: Math.max(1, query.page ?? 1),
      pageSize: Math.max(1, query.pageSize ?? 12),
      sort: this.resolveSort(query.sort),
      search: this.normalizeSearch(query.search) || undefined,
      compact,
      inStock: query.inStock ?? true,
      minPrice: query.min,
      maxPrice: query.max,
      animalKey: query.animalKey || undefined,
      categorySlug: query.categorySlug || undefined,
      category: normalizedCategory,
      subcategory: (query.subcategory || '').trim() || undefined,
      form: forms.length === 1 ? forms[0] : undefined,
      forms: forms.length ? forms : undefined,
      proteinSource: proteinSources.length === 1 ? proteinSources[0] : undefined,
      proteinSources: proteinSources.length ? proteinSources : undefined,
      brandId: brandIds.length === 1 ? Number(brandIds[0]) : undefined,
      brandIds: brandIds.length ? brandIds : undefined,
      specieId: specieIds.length === 1 ? Number(specieIds[0]) : undefined,
      specieIds: specieIds.length ? specieIds : undefined,
      lifeStageId: lifeStageIds.length === 1 ? Number(lifeStageIds[0]) : undefined,
      lifeStageIds: lifeStageIds.length ? lifeStageIds : undefined,
      dietTagIds: (query.dietTagIds || []).filter((value) => Number(value) > 0),
      healthConditionIds: (query.healthConditionIds || []).filter((value) => Number(value) > 0),
      ingredientIds: (query.ingredientIds || []).filter((value) => Number(value) > 0),
    };

    if (petProfileId && petProfileId > 0) {
      storefrontQuery.petProfileId = petProfileId;
      storefrontQuery.strictPet = query.strictPet === false ? false : true;
    }

    return storefrontQuery;
  }

  private fetchSinglePage(
    query: StorefrontProductsQuery,
    useMyProducts: boolean
  ): Observable<{ items: StorefrontProduct[]; total: number; page: number; pageSize: number }> {
    const request$ = useMyProducts
      ? this.storefrontApi.listMyProducts(query)
      : this.storefrontApi.listProducts(query);

    return request$.pipe(
      timeout(this.requestTimeoutMs),
      map((response) => ({
        items: response.data || [],
        total: response.meta?.pagination?.total ?? (response.data || []).length,
        page: response.meta?.pagination?.page ?? Number(query.page || 1),
        pageSize: response.meta?.pagination?.pageSize ?? Number(query.pageSize || this.clientFetchPageSize),
      }))
    );
  }

  private fetchAllPages(
    query: StorefrontProductsQuery,
    useMyProducts: boolean
  ): Observable<{ items: StorefrontProduct[]; total: number; page: number; pageSize: number }> {
    const requestedPageSize = Math.max(1, Math.min(this.clientFetchPageSize, Number(query.pageSize || this.clientFetchPageSize)));
    const uniqueById = new Set<number>();
    const items: StorefrontProduct[] = [];
    const appendChunk = (chunk: StorefrontProduct[]) => {
      for (const item of chunk || []) {
        if (uniqueById.has(item.id)) continue;
        uniqueById.add(item.id);
        items.push(item);
      }
    };

    const fetchNextPage = (page: number): Observable<{ items: StorefrontProduct[]; total: number; page: number; pageSize: number }> =>
      this.fetchSinglePage(
        {
          ...query,
          page,
          pageSize: requestedPageSize,
        },
        useMyProducts
      ).pipe(
        switchMap((response) => {
          const pageItems = response.items || [];
          appendChunk(pageItems);

          const shouldContinue = pageItems.length >= requestedPageSize && page < this.maxClientFetchPages;
          if (!shouldContinue) {
            return of({
              items,
              total: items.length,
              page: 1,
              pageSize: requestedPageSize,
            });
          }

          return fetchNextPage(page + 1);
        })
      );

    return fetchNextPage(1);
  }

  private toUiProduct(item: StorefrontProduct): Product {
    const oldPrice = this.resolveCompareAtPrice(item);

    return {
      id: String(item.id),
      documentId: item.documentId,
      slug: item.slug,
      name: item.name,
      price: Number(item.price || 0),
      oldPrice: oldPrice ?? undefined,
      image: this.resolveProductImage(item),
      badge: this.resolveBadge(item),
      category: item.category || 'general',
      subcategory: item.subcategory || undefined,
      tags: this.resolveTags(item),
      stock: Number(item.stock || 0),
      variants: (item.variants || []).map(v => ({
        id: v.id,
        label: v.label || '',
        price: Number(v.price || 0),
        compareAtPrice: Number(v.compareAtPrice || 0) > Number(v.price || 0) ? Number(v.compareAtPrice) : undefined,
        stock: typeof v.stock === 'number' ? v.stock : null,
      })),
    };
  }

  private resolveProductImage(item: StorefrontProduct): string {
    const media = (item.images || [])[0];
    const url =
      media?.formats?.['medium']?.url ||
      media?.formats?.['small']?.url ||
      media?.formats?.['thumbnail']?.url ||
      media?.url ||
      '';

    return this.storefrontApi.resolveMediaUrl(url) || 'assets/images/products/placeholder.png';
  }

  private resolveBadge(item: StorefrontProduct): Product['badge'] {
    // compareAtPrice discount always has priority
    if (this.getDiscountPercentage(item) > 0) return 'SALE';
    // Manual badge set in Strapi admin
    if (item.badge === 'NEW' || item.badge === 'TOP' || item.badge === 'SALE') return item.badge;
    // Auto TOP from low stock
    const stock = Number(item.stock || 0);
    if (stock <= 0) return null;
    if (stock <= 5) return 'TOP';
    return null;
  }

  private resolveTags(item: StorefrontProduct): string[] {
    const tags = [
      ...(item.category ? [item.category.toLowerCase()] : []),
      ...(item.subcategory ? [item.subcategory.toLowerCase()] : []),
      ...(item.brand?.name ? [item.brand.name.toLowerCase()] : []),
      ...(item.diet_tags || []).map((tag) => (tag.name || '').toLowerCase()),
      ...(item.health_claims || []).map((tag) => (tag.name || '').toLowerCase()),
      ...(item.ingredients || []).map((tag) => (tag.name || '').toLowerCase()),
      ...(item.speciesSupported || []).map((tag) => (tag.name || '').toLowerCase()),
      ...(item.lifeStages || []).map((tag) => (tag.name || '').toLowerCase()),
    ].filter(Boolean);

    return Array.from(new Set(tags));
  }

  private normalizeAllowedSubcategories(values: string[]): string[] {
    return Array.from(
      new Set(
        (values || [])
          .map((value) => this.normalizeSubcategoryValue(value))
          .filter(Boolean)
      )
    );
  }

  private normalizeTextList(values?: Array<string | null | undefined> | null): string[] {
    return Array.from(
      new Set(
        (values || [])
          .map((value) => String(value || '').trim())
          .filter(Boolean)
      )
    );
  }

  private filterByAllowedSubcategories(items: Product[], allowedSubcategories: string[]): Product[] {
    if (!allowedSubcategories.length) return items;

    const allowed = new Set(allowedSubcategories);
    return items.filter((item) => allowed.has(this.normalizeSubcategoryValue(item.subcategory)));
  }

  private filterStorefrontProductsByAllowedSubcategories(
    items: StorefrontProduct[],
    allowedSubcategories: string[]
  ): StorefrontProduct[] {
    if (!allowedSubcategories.length) return items;

    const allowed = new Set(allowedSubcategories);
    return (items || []).filter((item) =>
      allowed.has(this.normalizeSubcategoryValue(item.subcategory))
    );
  }

  private filterStorefrontProductsByCollectionTag(
    items: StorefrontProduct[],
    collectionTag: CatalogCollectionTag | null
  ): StorefrontProduct[] {
    if (!collectionTag) return items || [];

    if (collectionTag === 'new') {
      return [...(items || [])]
        .sort((a, b) => this.compareStorefrontByNewest(a, b))
        .slice(0, this.newArrivalsLimit);
    }

    return (items || []).filter((item) => this.getDiscountPercentage(item) >= this.clearanceThresholdPct);
  }

  private normalizeCollectionTag(value?: CatalogCollectionTag | string | null): CatalogCollectionTag | null {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'new' || normalized === 'clearance') {
      return normalized;
    }

    return null;
  }

  private compareStorefrontByNewest(a: StorefrontProduct, b: StorefrontProduct): number {
    const aTime = Date.parse(a.publishedAt || '') || 0;
    const bTime = Date.parse(b.publishedAt || '') || 0;
    if (bTime !== aTime) return bTime - aTime;
    return Number(b.id || 0) - Number(a.id || 0);
  }

  private resolveCompareAtPrice(item: StorefrontProduct): number | null {
    const price = Number(item.price || 0);
    const compareAtPrice = Number(item.compareAtPrice || 0);
    if (!Number.isFinite(compareAtPrice) || compareAtPrice <= 0) {
      return null;
    }

    return compareAtPrice > price ? compareAtPrice : null;
  }

  private getDiscountPercentage(item: Pick<StorefrontProduct, 'price' | 'compareAtPrice'>): number {
    const price = Number(item.price || 0);
    const compareAtPrice = Number(item.compareAtPrice || 0);

    if (!Number.isFinite(price) || !Number.isFinite(compareAtPrice) || price <= 0 || compareAtPrice <= price) {
      return 0;
    }

    return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
  }

  private normalizeSubcategoryValue(value?: string | null): string {
    return String(value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ');
  }

  private buildFacetsFromStorefrontProducts(items: StorefrontProduct[]): StorefrontProductFacets {
    const products = items || [];
    const priceValues = products
      .map((item) => Number(item.price || 0))
      .filter((value) => Number.isFinite(value) && value > 0);

    return {
      categories: this.collectNamedFacet(products.map((item) => item.category), {
        food: 'Alimento',
        treats: 'Snacks',
        hygiene: 'Higiene',
        health: 'Salud',
        accesories: 'Accesorios',
        other: 'Otros',
      }),
      subcategories: this.collectNamedFacet(products.map((item) => item.subcategory)),
      brands: this.collectTaxonomyFacet(products.map((item) => item.brand).filter(Boolean)),
      forms: this.collectNamedFacet(products.map((item) => item.form), {
        kibble: 'Croquetas',
        wet: 'Alimento humedo',
        treat: 'Premio',
        supplement: 'Suplemento',
        accesory: 'Accesorio',
        hygiene: 'Cuidado e higiene',
      }),
      proteinSources: this.collectNamedFacet(products.map((item) => item.proteinSource), {
        chicken: 'Pollo',
        beef: 'Res',
        fish: 'Pescado',
        lamb: 'Cordero',
        turkey: 'Pavo',
        insect: 'Insecto',
        plant: 'Vegetal',
        mixed: 'Mezcla',
      }),
      species: this.collectTaxonomyFacet(products.flatMap((item) => item.speciesSupported || [])),
      lifeStages: this.collectTaxonomyFacet(products.flatMap((item) => item.lifeStages || [])),
      dietTags: this.collectTaxonomyFacet(products.flatMap((item) => item.diet_tags || [])),
      healthConditions: this.collectTaxonomyFacet(products.flatMap((item) => item.health_claims || [])),
      ingredients: this.collectTaxonomyFacet(products.flatMap((item) => item.ingredients || [])),
      priceRange: {
        min: priceValues.length ? Math.min(...priceValues) : 0,
        max: priceValues.length ? Math.max(...priceValues) : 0,
      },
      totalProducts: products.length,
    };
  }

  private collectNamedFacet(
    values: Array<string | null | undefined>,
    labels: Record<string, string> = {}
  ): Array<{ value: string; label: string; count: number }> {
    const counts = new Map<string, { value: string; label: string; count: number }>();

    for (const rawValue of values || []) {
      const value = String(rawValue || '').trim();
      const normalized = value.toLowerCase();
      if (!normalized) continue;

      const found = counts.get(normalized);
      if (found) {
        found.count += 1;
      } else {
        counts.set(normalized, {
          value,
          label: labels[normalized] || value,
          count: 1,
        });
      }
    }

    return Array.from(counts.values()).sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.label.localeCompare(b.label, 'es');
    });
  }

  private collectTaxonomyFacet(
    values: Array<{ id: number; name?: string; slug?: string | null; logo?: StorefrontMedia | null } | null | undefined>
  ): Array<{ id: number; name: string; slug?: string | null; count: number }> {
    const counts = new Map<number, { id: number; name: string; slug?: string | null; logo?: StorefrontMedia | null; count: number }>();

    for (const item of values || []) {
      const id = Number(item?.id || 0);
      const name = String(item?.name || '').trim();
      if (!id || !name) continue;

      const found = counts.get(id);
      if (found) {
        found.count += 1;
      } else {
        counts.set(id, {
          id,
          name,
          slug: item?.slug || null,
          logo: item?.logo || null,
          count: 1,
        });
      }
    }

    return Array.from(counts.values()).sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name, 'es');
    });
  }

  private normalizeSearch(value?: string): string {
    return String(value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  }

  private tokenizeSearch(value: string): string[] {
    return Array.from(new Set(
      this.normalizeSearch(value)
        .split(' ')
        .map((token) => token.trim())
        .filter((token) => token.length >= 2)
    ));
  }

  private expandSearchToken(token: string): string[] {
    const normalized = this.normalizeSearch(token);
    if (!normalized) return [];

    const singular = normalized.endsWith('s') && normalized.length > 3 ? normalized.slice(0, -1) : '';
    const plural = !normalized.endsWith('s') && normalized.length > 2 ? `${normalized}s` : '';

    return Array.from(new Set([
      normalized,
      singular,
      plural,
      ...(this.searchAliases[normalized] || []),
      ...(singular ? this.searchAliases[singular] || [] : []),
    ].map((value) => this.normalizeSearch(value)).filter((value) => value.length >= 2)));
  }

  private buildExcludedTerms(rawTerms: string[]): string[] {
    const stopWords = new Set([
      'al', 'a', 'de', 'del', 'la', 'el', 'los', 'las', 'con', 'sin', 'por', 'para', 'y',
      'alergia', 'alergico', 'alergica', 'intolerancia', 'sensible'
    ]);

    const aliases: Record<string, string[]> = {
      pavo: ['turkey'],
      turkey: ['pavo'],
      pollo: ['chicken'],
      chicken: ['pollo'],
      res: ['beef'],
      beef: ['res'],
      pescado: ['fish'],
      fish: ['pescado'],
      cordero: ['lamb'],
      lamb: ['cordero'],
      maiz: ['corn'],
      corn: ['maiz'],
      gluten: ['trigo', 'wheat'],
      trigo: ['wheat', 'gluten'],
      wheat: ['trigo', 'gluten'],
      lactosa: ['lactose'],
      lactose: ['lactosa'],
      soya: ['soy'],
      soy: ['soya'],
    };

    const normalized = rawTerms
      .flatMap((term) =>
        String(term || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .split(/[^a-zA-Z0-9áéíóúñü]+/)
          .map((token) => token.trim())
      )
      .filter((token) => token.length >= 3 && !stopWords.has(token));

    const expanded = normalized.flatMap((token) => [token, ...(aliases[token] || [])]);
    return Array.from(new Set(expanded));
  }

  private excludeByAllergyTerms(items: Product[], terms: string[]): Product[] {
    if (!terms.length) return items;

    return items.filter((item) => {
      const haystack = `${item.name} ${(item.category || '')} ${(item.subcategory || '')} ${(item.tags || []).join(' ')}`.toLowerCase();
      return !terms.some((term) => haystack.includes(term));
    });
  }

  private applyLocalPriceFilter(items: Product[], min?: number, max?: number): Product[] {
    const hasMin = Number.isFinite(min as number);
    const hasMax = Number.isFinite(max as number);
    if (!hasMin && !hasMax) return items;

    return items.filter((item) => {
      const price = Number(item.price || 0);
      if (hasMin && price < Number(min)) return false;
      if (hasMax && price > Number(max)) return false;
      return true;
    });
  }

  private rankBySearch(items: Product[], search: string): Array<{ item: Product; score: number }> {
    const tokens = this.tokenizeSearch(search);
    const expandedTokens = Array.from(new Set(tokens.flatMap((token) => this.expandSearchToken(token))));
    const normalizedSearch = this.normalizeSearch(search);

    return items
      .map((item) => {
        const name = this.normalizeSearch(item.name);
        const category = this.normalizeSearch(item.category || '');
        const subcategory = this.normalizeSearch(item.subcategory || '');
        const tags = (item.tags || []).map((tag) => this.normalizeSearch(tag));
        const haystack = [name, category, subcategory, ...tags].filter(Boolean).join(' ');

        let score = 0;
        let matched = false;

        if (name === normalizedSearch) {
          score += 140;
          matched = true;
        } else if (name.startsWith(normalizedSearch)) {
          score += 110;
          matched = true;
        } else if (name.includes(normalizedSearch)) {
          score += 85;
          matched = true;
        }

        if (normalizedSearch && haystack.includes(normalizedSearch)) {
          score += 40;
          matched = true;
        }

        for (const token of expandedTokens) {
          if (name.startsWith(token)) {
            score += 30;
            matched = true;
          } else if (name.includes(token)) {
            score += 20;
            matched = true;
          }

          if (category.includes(token)) {
            score += 12;
            matched = true;
          }
          if (subcategory.includes(token)) {
            score += 14;
            matched = true;
          }

          const matchingTag = tags.some((tag) => tag.includes(token));
          if (matchingTag) {
            score += 14;
            matched = true;
          }

          if (haystack.includes(token)) {
            score += 6;
            matched = true;
          }
        }

        if (matched && (item.stock || 0) > 0) score += 3;

        return { item, score, matched };
      })
      .filter((entry) => entry.matched && entry.score > 0)
      .map(({ item, score }) => ({ item, score }));
  }

  private sortScored(
    entries: Array<{ item: Product; score: number }>,
    sort: CatalogQuery['sort'],
    collectionTag?: CatalogCollectionTag | null
  ): Array<{ item: Product; score: number }> {
    return [...entries].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;

      if ((collectionTag || null) === 'clearance' && (!sort || sort === 'popular')) {
        const discountDiff = this.getProductDiscountPercentage(b.item) - this.getProductDiscountPercentage(a.item);
        if (discountDiff !== 0) return discountDiff;
      }

      if (sort === 'price-asc') return a.item.price - b.item.price;
      if (sort === 'price-desc') return b.item.price - a.item.price;
      if (sort === 'new') return String(b.item.id).localeCompare(String(a.item.id));

      return String(b.item.id).localeCompare(String(a.item.id));
    });
  }

  private sortPlain(items: Product[], sort: CatalogQuery['sort'], collectionTag?: CatalogCollectionTag | null): Product[] {
    if ((collectionTag || null) === 'clearance' && (!sort || sort === 'popular')) {
      return [...items].sort((a, b) => {
        const discountDiff = this.getProductDiscountPercentage(b) - this.getProductDiscountPercentage(a);
        if (discountDiff !== 0) return discountDiff;
        return b.price - a.price;
      });
    }

    if (sort === 'price-asc') {
      return [...items].sort((a, b) => a.price - b.price);
    }

    if (sort === 'price-desc') {
      return [...items].sort((a, b) => b.price - a.price);
    }

    if (sort === 'new') {
      return [...items].sort((a, b) => String(b.id).localeCompare(String(a.id)));
    }

    return items;
  }

  private getProductDiscountPercentage(item: Pick<Product, 'price' | 'oldPrice'>): number {
    const price = Number(item.price || 0);
    const oldPrice = Number(item.oldPrice || 0);

    if (!Number.isFinite(price) || !Number.isFinite(oldPrice) || price <= 0 || oldPrice <= price) {
      return 0;
    }

    return Math.round(((oldPrice - price) / oldPrice) * 100);
  }

  private resolveSort(sort: CatalogQuery['sort']): string {
    if (sort === 'price-asc') return 'price:asc';
    if (sort === 'price-desc') return 'price:desc';
    if (sort === 'new') return 'createdAt:desc';
    return 'createdAt:desc';
  }

  private normalizeCategory(rawCategory?: string | null): string | undefined {
    const category = (rawCategory || '').trim().toLowerCase();
    if (!category) return undefined;
    if (category === 'all') return undefined;

    if (Object.prototype.hasOwnProperty.call(this.categorySlugMap, category)) {
      const mapped = this.categorySlugMap[category];
      return mapped || undefined;
    }

    return category;
  }
}
