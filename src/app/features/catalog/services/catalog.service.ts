import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap, timeout } from 'rxjs/operators';
import { AppHttpError } from '../../../core/models/http.models';
import {
  StorefrontProduct,
  StorefrontProductFacets,
  StorefrontProductsQuery,
} from '../../../core/models/storefront.models';
import { StorefrontApiService } from '../../../core/services/storefront-api.service';
import { Product } from '../models/product.model';

export interface CatalogQuery {
  category?: string | null;
  subcategory?: string | null;
  allowedSubcategories?: string[];
  search?: string;
  min?: number;
  max?: number;
  sort?: 'popular' | 'price-asc' | 'price-desc' | 'new';
  page?: number;
  pageSize?: number;
  inStock?: boolean;
  strictPet?: boolean;
  excludedTerms?: string[];
  form?: string | null;
  proteinSource?: string | null;
  brandId?: number | null;
  specieId?: number | null;
  lifeStageId?: number | null;
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
  private facetsEndpointUnavailable = false;

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

    if (allowedSubcategories.length > 0) {
      const storefrontQuery = this.buildStorefrontQuery(
        {
          ...query,
          allowedSubcategories: [],
          page: 1,
          pageSize: this.clientFetchPageSize,
        },
        petProfileId,
        false
      );

      return this.fetchAllPages(storefrontQuery, Boolean(petProfileId && petProfileId > 0)).pipe(
        map((response) => {
          const filtered = this.filterStorefrontProductsByAllowedSubcategories(response.items || [], allowedSubcategories);
          return this.buildFacetsFromStorefrontProducts(filtered);
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
    const requiresRichProductData = blockedTerms.length > 0 || allowedSubcategories.length > 0;
    const useClientFiltering = requiresRichProductData;
    const useSearchRanking = requiresRichProductData && normalizedSearch.length > 0;

    const storefrontQuery = this.buildStorefrontQuery(
      {
        ...query,
        search: normalizedSearch,
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
        const baseItems = (source.items || []).map((item) => this.toUiProduct(item));
        const withoutAllergyConflicts = this.excludeByAllergyTerms(baseItems, blockedTerms);
        const subcategoryFiltered = this.filterByAllowedSubcategories(withoutAllergyConflicts, allowedSubcategories);
        const priceFiltered = this.applyLocalPriceFilter(subcategoryFiltered, query.min, query.max);
        const scored = useSearchRanking ? this.rankBySearch(priceFiltered, normalizedSearch) : [];
        const resolved = useSearchRanking
          ? this.sortScored(scored, query.sort).map((entry) => entry.item)
          : this.sortPlain(priceFiltered, query.sort);

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

  private buildStorefrontQuery(
    query: CatalogQuery,
    petProfileId?: number,
    compact = false
  ): StorefrontProductsQuery {
    const normalizedCategory = this.normalizeCategory(query.category);

    const storefrontQuery: StorefrontProductsQuery = {
      page: Math.max(1, query.page ?? 1),
      pageSize: Math.max(1, query.pageSize ?? 12),
      sort: this.resolveSort(query.sort),
      search: this.normalizeSearch(query.search) || undefined,
      compact,
      inStock: query.inStock ?? true,
      minPrice: query.min,
      maxPrice: query.max,
      category: normalizedCategory,
      subcategory: (query.subcategory || '').trim() || undefined,
      form: (query.form || '').trim() || undefined,
      proteinSource: (query.proteinSource || '').trim() || undefined,
      brandId: Number(query.brandId || 0) > 0 ? Number(query.brandId) : undefined,
      specieId: Number(query.specieId || 0) > 0 ? Number(query.specieId) : undefined,
      lifeStageId: Number(query.lifeStageId || 0) > 0 ? Number(query.lifeStageId) : undefined,
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
    return {
      id: String(item.id),
      documentId: item.documentId,
      slug: item.slug,
      name: item.name,
      price: Number(item.price || 0),
      image: this.resolveProductImage(item),
      badge: this.resolveBadge(item),
      category: item.category || 'general',
      subcategory: item.subcategory || undefined,
      tags: this.resolveTags(item),
      stock: Number(item.stock || 0),
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
    const stock = Number(item.stock || 0);
    if (stock <= 0) return 'SALE';
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
    values: Array<{ id: number; name?: string; slug?: string | null } | null | undefined>
  ): Array<{ id: number; name: string; slug?: string | null; count: number }> {
    const counts = new Map<number, { id: number; name: string; slug?: string | null; count: number }>();

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
    return String(value || '').trim().toLowerCase();
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
    const tokens = Array.from(new Set(search.split(/\s+/).map((token) => token.trim()).filter(Boolean)));
    const normalizedSearch = search.trim();

    return items
      .map((item) => {
        const name = item.name.toLowerCase();
        const category = (item.category || '').toLowerCase();
        const subcategory = (item.subcategory || '').toLowerCase();
        const tags = (item.tags || []).map((tag) => tag.toLowerCase());

        let score = 0;

        if (name === normalizedSearch) score += 140;
        else if (name.startsWith(normalizedSearch)) score += 110;
        else if (name.includes(normalizedSearch)) score += 85;

        for (const token of tokens) {
          if (name.startsWith(token)) score += 30;
          else if (name.includes(token)) score += 20;

          if (category.includes(token)) score += 12;
          if (subcategory.includes(token)) score += 14;

          const matchingTag = tags.some((tag) => tag.includes(token));
          if (matchingTag) score += 14;
        }

        if ((item.stock || 0) > 0) score += 3;

        return { item, score };
      })
      .filter((entry) => entry.score > 0);
  }

  private sortScored(
    entries: Array<{ item: Product; score: number }>,
    sort: CatalogQuery['sort']
  ): Array<{ item: Product; score: number }> {
    return [...entries].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;

      if (sort === 'price-asc') return a.item.price - b.item.price;
      if (sort === 'price-desc') return b.item.price - a.item.price;
      if (sort === 'new') return String(b.item.id).localeCompare(String(a.item.id));

      return String(b.item.id).localeCompare(String(a.item.id));
    });
  }

  private sortPlain(items: Product[], sort: CatalogQuery['sort']): Product[] {
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
