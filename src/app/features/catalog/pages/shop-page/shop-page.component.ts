import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit, ViewRef } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { combineLatest, EMPTY, Subject, forkJoin, of } from 'rxjs';
import { catchError, distinctUntilChanged, map, shareReplay, switchMap, takeUntil, tap } from 'rxjs/operators';
import { AuthService } from '../../../../auth/services/auth.service';
import { AppHttpError } from '../../../../core/models/http.models';
import {
  StorefrontCatalogFilterDefinition,
  StorefrontCatalogTaxonomy,
  StorefrontCatalogTaxonomyAnimal,
  StorefrontCatalogTaxonomyCategory,
  StorefrontCatalogTaxonomySubcategory,
  StorefrontProductFacets,
  StorefrontTaxonomyItem,
} from '../../../../core/models/storefront.models';
import { SeoService } from '../../../../core/services/seo.service';
import { StorefrontApiService } from '../../../../core/services/storefront-api.service';
import { CartStateService } from '../../../cart/services/cart-state.service';
import { DIET_LABEL, LIFESTAGE_LABEL, Pet, SIZE_LABEL, SPECIES_LABEL } from '../../../pets/models/pet.models';
import { PetsStateService } from '../../../pets/services/pet-state.service';
import {
  BASE_CATALOG_CATEGORIES,
  CatalogCategoryKey,
  CatalogPetConfig,
  CatalogPetType,
  getCatalogCategoryLabel,
  getCatalogPetByKey,
  getCatalogPetBySlug,
  matchCatalogPetFromTaxonomy,
} from '../../catalog-navigation.config';
import { DrawerFacetControlKey, FilterState } from '../../components/filters-drawer/filters-drawer.component';
import { Product } from '../../models/product.model';
import { CatalogCollectionTag, CatalogQuery, CatalogService } from '../../services/catalog.service';

type SortType = 'popular' | 'price-asc' | 'price-desc' | 'new';

interface NavQuery {
  petType?: CatalogPetType | null;
  tag?: CatalogCollectionTag | null;
  sort?: SortType;
  page?: number;
  pageSize?: number;
  search?: string | null;
  min?: number | null;
  max?: number | null;
  stock?: 'in' | 'all' | null;
  pet?: string | null;
  cat?: string | null;
  sub?: string | null;
  brand?: number | null;
  form?: string | null;
  protein?: string | null;
  specie?: number | null;
  stage?: number | null;
  diet?: number | null;
  health?: number | null;
  ingredient?: number | null;
}

interface RouteState {
  slug: string | null;
  petType: CatalogPetType | null;
  tag: CatalogCollectionTag | null;
  sort: SortType;
  page: number;
  pageSize: number;
  search: string;
  min: number | null;
  max: number | null;
  inStockOnly: boolean;
  petId: string | null;
  category: string | null;
  subcategory: string | null;
  brandId: number | null;
  form: string | null;
  proteinSource: string | null;
  specieId: number | null;
  lifeStageId: number | null;
  dietTagId: number | null;
  healthConditionId: number | null;
  ingredientId: number | null;
}

interface SubcategoryChip {
  value: string;
  label: string;
  count: number;
  suggested?: boolean;
  description?: string;
}

interface CategoryOption {
  value: string;
  label: string;
  shortLabel?: string;
  legacyCategory?: string | null;
}

interface CategoryBrowseOption extends CategoryOption {
  count: number;
  note: string;
  previewTags: string[];
}

interface HeroPathStep {
  level: 'family' | 'category' | 'subcategory';
  label: string;
  active: boolean;
  clickable: boolean;
}

@Component({
  standalone: false,
  selector: 'app-shop-page',
  templateUrl: './shop-page.component.html',
  styleUrl: './shop-page.component.scss'
})
export class ShopPageComponent implements OnInit, OnDestroy {
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

  private readonly speciesTaxonomy$ = this.storefrontApi.getPetTaxonomy().pipe(
    map((response) => response.data?.species || []),
    catchError(() => of([] as StorefrontTaxonomyItem[])),
    shareReplay(1)
  );

  slug: string | null = null;
  selectedPetType: CatalogPetType | null = null;
  collectionTag: CatalogCollectionTag | null = null;
  loading = true;
  errorMsg = '';
  items: Product[] = [];
  total = 0;
  facets: StorefrontProductFacets = this.emptyFacets;
  navFacets: StorefrontProductFacets = this.emptyFacets;
  priceRangeBounds: { min: number; max: number } | null = null;
  subcategoryChipList: SubcategoryChip[] = [];
  speciesTaxonomy: StorefrontTaxonomyItem[] = [];
  catalogTaxonomy: StorefrontCatalogTaxonomy | null = null;

  sort: SortType = 'popular';
  page = 1;
  pageSize = 12;
  search = '';
  searchDraft = '';

  filters: FilterState = {
    min: null,
    max: null,
    inStockOnly: true,
    petId: null,
    category: null,
    subcategory: null,
    brandId: null,
    form: null,
    proteinSource: null,
    specieId: null,
    lifeStageId: null,
    dietTagId: null,
    healthConditionId: null,
    ingredientId: null,
  };

  readonly baseCategories = BASE_CATALOG_CATEGORIES;

  pets: Pet[] = [];
  isLoggedIn = false;
  filtersOpen = false;
  discoveryOpen = false;

  private activeRequestId = 0;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: CatalogService,
    private cart: CartStateService,
    private petsState: PetsStateService,
    private auth: AuthService,
    private seo: SeoService,
    private storefrontApi: StorefrontApiService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.auth.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        this.isLoggedIn = !!user;

        if (!this.isLoggedIn && this.filters.petId) {
          this.setPetFilter(null);
        }
      });

    this.petsState.pets$
      .pipe(takeUntil(this.destroy$))
      .subscribe((pets) => {
        this.pets = pets;

        if (this.filters.petId && !pets.some((pet) => String(pet.id) === this.filters.petId)) {
          this.setPetFilter(null);
        }
      });

    this.storefrontApi.getCatalogTaxonomy()
      .pipe(
        takeUntil(this.destroy$),
        map((response) => response.data || null),
        catchError(() => of(null))
      )
      .subscribe((taxonomy) => {
        this.applyState(() => {
          this.catalogTaxonomy = taxonomy;
          this.subcategoryChipList = this.computeSubcategoryChips();
        });
      });

    combineLatest([this.route.paramMap, this.route.queryParamMap, this.speciesTaxonomy$])
      .pipe(
        takeUntil(this.destroy$),
        map(([pm, qp, species]) => this.mapRouteState(pm.get('slug'), qp, species)),
        distinctUntilChanged((previous, current) => JSON.stringify(previous) === JSON.stringify(current)),
        tap((state) => {
          this.applyState(() => {
            this.slug = state.slug;
            this.selectedPetType = state.petType;
            this.collectionTag = state.tag;
            this.sort = state.sort;
            this.page = state.page;
            this.pageSize = state.pageSize;
            this.search = state.search;
            this.searchDraft = state.search;
            this.filters = {
              min: state.min,
              max: state.max,
              inStockOnly: state.inStockOnly,
              petId: state.petId,
              category: state.category,
              subcategory: state.subcategory,
              brandId: state.brandId,
              form: state.form,
              proteinSource: state.proteinSource,
              specieId: state.specieId,
              lifeStageId: state.lifeStageId,
              dietTagId: state.dietTagId,
              healthConditionId: state.healthConditionId,
              ingredientId: state.ingredientId,
            };
            this.subcategoryChipList = this.computeSubcategoryChips();
          });
        }),
        switchMap(() => this.fetchCatalog$())
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get hasPetProfiles(): boolean {
    return this.isLoggedIn && this.pets.length > 0;
  }

  get lockBiologyFilters(): boolean {
    return Boolean(this.filters.petId);
  }

  get selectedPetProfile(): Pet | null {
    if (!this.filters.petId) return null;
    return this.pets.find((pet) => String(pet.id) === this.filters.petId) || null;
  }

  get currentPetConfig(): CatalogPetConfig | null {
    return getCatalogPetByKey(this.selectedPetType);
  }

  get activeAnimalTaxonomy(): StorefrontCatalogTaxonomyAnimal | null {
    const normalized = String(this.selectedPetType || '').trim().toLowerCase();
    if (!normalized || !this.catalogTaxonomy?.animals?.length) {
      return null;
    }

    return this.catalogTaxonomy.animals.find((item) => item.key === normalized || item.slug === normalized) || null;
  }

  get selectedCategoryTaxonomy(): StorefrontCatalogTaxonomyCategory | null {
    const selectedCategory = String(this.filters.category || this.normalizeRouteCategory(this.slug) || '').trim().toLowerCase();
    if (!selectedCategory) return null;

    return this.findCategoryTaxonomyByValue(selectedCategory);
  }

  get selectedSubcategoryTaxonomy(): StorefrontCatalogTaxonomySubcategory | null {
    return this.findSubcategoryTaxonomyByValue(this.filters.subcategory);
  }

  get categoryOptions(): CategoryOption[] {
    if (this.activeAnimalTaxonomy?.categories?.length) {
      return this.activeAnimalTaxonomy.categories.map((category) => ({
        value: category.slug,
        label: category.label,
        shortLabel: category.label,
        legacyCategory: category.legacyCategory || null,
      }));
    }

    return this.baseCategories.map((category) => ({
      value: category.value,
      label: getCatalogCategoryLabel(category.value, this.selectedPetType),
      shortLabel: category.shortLabel || getCatalogCategoryLabel(category.value, this.selectedPetType),
      legacyCategory: category.value,
    }));
  }

  get pageTitle(): string {
    if (this.collectionTag === 'new' && !this.selectedPetType && !this.filters.category && !this.filters.subcategory) {
      return 'Recien llegados';
    }

    if (this.collectionTag === 'clearance' && !this.selectedPetType && !this.filters.category && !this.filters.subcategory) {
      return 'Ofertas imperdibles';
    }

    const familyLabel = this.activeAnimalTaxonomy?.label || this.currentPetConfig?.label || 'mascotas';
    const taxonomyHeadline = this.activeAnimalTaxonomy?.headline?.trim();
    const selectedSubcategoryLabel = this.selectedSubcategoryTaxonomy?.label || this.resolveSubcategoryDisplayLabel(this.filters.subcategory);
    if (selectedSubcategoryLabel) {
      return `${selectedSubcategoryLabel} para ${familyLabel}`;
    }

    const selectedCategoryLabel = this.selectedCategoryTaxonomy?.label
      || (this.filters.category ? this.resolveCategoryDisplayLabel(this.filters.category) : '');
    if (selectedCategoryLabel) {
      return `${selectedCategoryLabel} para ${familyLabel}`;
    }

    if (taxonomyHeadline) {
      return taxonomyHeadline;
    }

    if (this.currentPetConfig) {
      return this.currentPetConfig.headline;
    }

    return familyLabel === 'mascotas' ? 'Tienda' : `Todo para ${familyLabel.toLowerCase()}`;
  }

  get pageSubtitle(): string {
    if (this.collectionTag === 'new' && !this.selectedPetType && !this.filters.category && !this.filters.subcategory) {
      return 'Descubre lo ultimo que acaba de llegar a la tienda y encuentra novedades antes de que se agoten.';
    }

    if (this.collectionTag === 'clearance' && !this.selectedPetType && !this.filters.category && !this.filters.subcategory) {
      return 'Aprovecha descuentos de 45% o mas en productos seleccionados antes de que vuelen.';
    }

    const subcategoryDescription = String(this.selectedSubcategoryTaxonomy?.description || '').trim();
    if (subcategoryDescription) {
      return subcategoryDescription;
    }

    const categoryDescription = String(this.selectedCategoryTaxonomy?.description || '').trim();
    if (categoryDescription) {
      return categoryDescription;
    }

    const animalDescription = String(this.activeAnimalTaxonomy?.description || '').trim();
    if (animalDescription) {
      return animalDescription;
    }

    const taxonomySubtitle = String(this.activeAnimalTaxonomy?.subtitle || '').trim();
    if (taxonomySubtitle) {
      return taxonomySubtitle;
    }

    if (this.currentPetConfig?.subtitle) {
      return this.currentPetConfig.subtitle;
    }

    return 'Descubre productos para consentir, cuidar y acompañar a tu mascota en cada etapa, con una tienda pensada para encontrar justo lo que buscas.';
  }

  get discoveryToggleLabel(): string {
    return this.discoveryOpen ? 'Ocultar navegacion' : 'Mostrar navegacion';
  }

  get searchPlaceholder(): string {
    return 'Buscar productos, marcas o necesidades';
  }

  get activeFiltersCount(): number {
    const values = this.filters;
    return [
      values.min,
      values.max,
      values.inStockOnly === false ? 1 : null,
      values.petId,
      values.brandId,
      values.form,
      values.proteinSource,
      values.specieId,
      values.lifeStageId,
      values.dietTagId,
      values.healthConditionId,
      values.ingredientId,
    ].filter((value) => value !== null && value !== undefined && value !== '').length;
  }

  get categoryBrowseOptions(): CategoryBrowseOption[] {
    const counts = new Map(
      (this.navFacets.categories || []).map((item) => [String(item.value || '').toLowerCase(), Number(item.count || 0)])
    );

    return this.categoryOptions.map((category) => ({
      ...category,
      count: this.resolveCategoryCount(category.value, counts),
      note: this.resolveCategoryNote(category.value),
      previewTags: this.resolveCategoryPreviewTags(category.value),
    }));
  }

  get contextPathSteps(): HeroPathStep[] {
    const selectedCategory = this.selectedCategoryTaxonomy;
    const selectedSubcategory = this.selectedSubcategoryTaxonomy;
    const fallbackCategory = this.filters.category ? this.resolveCategoryDisplayLabel(this.filters.category) : '';
    const fallbackSubcategory = this.resolveSubcategoryDisplayLabel(this.filters.subcategory);
    const familyLabel = this.activeAnimalTaxonomy?.label || this.currentPetConfig?.label || 'Catalogo general';
    const isGeneralCatalog = !this.selectedPetType && !fallbackCategory && !fallbackSubcategory;

    if (isGeneralCatalog) {
      return [];
    }

    const steps: HeroPathStep[] = [
      {
        level: 'family',
        label: familyLabel,
        active: !selectedCategory && !selectedSubcategory && !this.filters.subcategory,
        clickable: Boolean(selectedCategory || selectedSubcategory || this.filters.subcategory),
      },
    ];

    const categoryLabel = selectedCategory?.label || fallbackCategory;
    if (categoryLabel) {
      steps.push({
        level: 'category',
        label: categoryLabel,
        active: !selectedSubcategory && !this.filters.subcategory,
        clickable: Boolean(selectedSubcategory || this.filters.subcategory),
      });
    }

    const subcategoryLabel = selectedSubcategory?.label || fallbackSubcategory;
    if (subcategoryLabel) {
      steps.push({
        level: 'subcategory',
        label: subcategoryLabel,
        active: true,
        clickable: false,
      });
    }

    return steps;
  }

  get activeCategoryLabel(): string {
    const selectedCategory = this.filters.category;
    if (!selectedCategory) {
      return 'Todas las categorias';
    }

    return this.resolveCategoryDisplayLabel(selectedCategory);
  }

  get recommendedFilterDefinitions(): StorefrontCatalogFilterDefinition[] {
    if (this.selectedSubcategoryTaxonomy?.recommendedFilters?.length) {
      return this.selectedSubcategoryTaxonomy.recommendedFilters;
    }

    if (this.selectedCategoryTaxonomy?.recommendedFilters?.length) {
      return this.selectedCategoryTaxonomy.recommendedFilters;
    }

    return [];
  }

  get visibleFacetControls(): DrawerFacetControlKey[] {
    const defaults: DrawerFacetControlKey[] = [
      'form',
      'proteinSource',
      'specieId',
      'lifeStageId',
      'dietTagId',
      'healthConditionId',
      'ingredientId',
    ];

    const filtered = this.recommendedFilterDefinitions
      .filter((item) => item.availability === 'available' && this.isDrawerFacetControlKey(item.control))
      .map((item) => item.control as DrawerFacetControlKey);

    return filtered.length ? Array.from(new Set(filtered)) : defaults;
  }

  get veterinaryHint(): string {
    if (this.selectedSubcategoryTaxonomy) {
      return this.selectedSubcategoryTaxonomy.description;
    }

    if (this.selectedCategoryTaxonomy) {
      return this.selectedCategoryTaxonomy.description;
    }

    return this.activeAnimalTaxonomy?.description || '';
  }

  get veterinaryFocusTags(): string[] {
    return this.recommendedFilterDefinitions
      .filter((item) => item.availability === 'available')
      .map((item) => item.label)
      .slice(0, 6);
  }

  get subcategoryChips(): SubcategoryChip[] {
    return this.subcategoryChipList;
  }

  private computeSubcategoryChips(): SubcategoryChip[] {
    const selectedCategory = String(this.filters.category || this.normalizeRouteCategory(this.slug) || '').trim();
    if (!selectedCategory) {
      return [];
    }

    const actual = this.sortSubcategoryChips(this.filterSubcategoriesForSelectedCategory(this.facets.subcategories)).map((item) => ({
      ...item,
      suggested: false,
    }));

    const taxonomySubcategories = this.selectedCategoryTaxonomy?.subcategories || [];
    const curatedFromTaxonomy = taxonomySubcategories.map((item) => ({
      value: item.slug || item.key || item.label,
      label: item.label,
      count: this.countFacetMatchesForTerms(this.facets.subcategories, this.collectSubcategoryTerms(item)),
      suggested: this.countFacetMatchesForTerms(this.facets.subcategories, this.collectSubcategoryTerms(item)) === 0,
      description: item.description,
    }));

    if (actual.length && !curatedFromTaxonomy.length) {
      return actual.slice(0, 10);
    }

    const curatedFromConfig = (this.currentPetConfig?.subcategorySuggestions?.[selectedCategory as CatalogCategoryKey] || []).map((item) => ({
      value: item,
      label: item,
      count: 0,
      suggested: true,
    }));

    const matchedTaxonomyValues = new Set(
      taxonomySubcategories
        .flatMap((item) => this.collectSubcategoryTerms(item))
        .map((value) => this.normalizeSubcategoryText(value))
    );
    const unmatchedActual = actual.filter(
      (item) => !matchedTaxonomyValues.has(this.normalizeSubcategoryText(item.label || item.value || ''))
    );
    const merged = new Map<string, SubcategoryChip>();

    for (const item of [...curatedFromTaxonomy, ...unmatchedActual, ...curatedFromConfig]) {
      const key = this.normalizeSubcategoryText(item.label || item.value || '');
      if (!merged.has(key)) {
        merged.set(key, item);
        continue;
      }

      const found = merged.get(key)!;
      if (!found.count && item.count) {
        found.count = item.count;
      }
      if (found.suggested && item.suggested === false) {
        found.suggested = false;
      }
    }

    return Array.from(merged.values()).slice(0, 10);
  }

  get spotlightFilterTags(): string[] {
    return this.recommendedFilterDefinitions.map((item) => item.label).slice(0, 6);
  }

  get hasSuggestedSubcategories(): boolean {
    return !this.facets.subcategories.length && this.subcategoryChipList.some((item) => item.suggested);
  }

  get subcategoryPanelTitle(): string {
    if (this.filters.category) {
      return `Detalles dentro de ${this.activeCategoryLabel}`;
    }

    return this.hasSuggestedSubcategories ? 'Subcategorias sugeridas' : 'Subcategorias disponibles';
  }

  get subcategoryPanelCopy(): string {
    if (this.selectedPetProfile) {
      return `Refina la navegacion para ${this.selectedPetProfile.name} sin perder el contexto de su perfil.`;
    }

    if (this.currentPetConfig && this.hasSuggestedSubcategories) {
      return `Tomamos sugerencias utiles para ${this.currentPetConfig.label.toLowerCase()} mientras completamos subcategorias reales para esa necesidad.`;
    }

    if (this.currentPetConfig) {
      return `Explora soluciones mas concretas dentro del contexto de ${this.currentPetConfig.label.toLowerCase()}.`;
    }

    return 'Afina la tienda por necesidad especifica dentro de la categoria actual.';
  }

  get petTemplateSummary(): string {
    const pet = this.selectedPetProfile;
    if (!pet) {
      return 'Si eliges una mascota, el catalogo usa su especie, etapa, peso, preferencias y alertas registradas como plantilla de filtrado.';
    }

    const parts = [
      `${pet.name} esta guiando este catalogo.`,
      pet.species ? `Especie: ${SPECIES_LABEL[pet.species].toLowerCase()}.` : '',
      pet.lifeStage ? `Etapa: ${LIFESTAGE_LABEL[pet.lifeStage].toLowerCase()}.` : '',
      Number.isFinite(Number(pet.weightKg)) ? `Peso aprox: ${Number(pet.weightKg)} kg.` : '',
      pet.diet?.length ? `Preferencias: ${pet.diet.slice(0, 2).map((entry) => DIET_LABEL[entry]).join(', ').toLowerCase()}.` : '',
      pet.allergies?.length ? `Tambien se revisan alertas relacionadas con ${pet.allergies.slice(0, 2).join(', ')}.` : '',
    ].filter(Boolean);

    return parts.join(' ');
  }

  get selectedCategoryNote(): string {
    const selectedCategory = this.filters.category;
    if (!selectedCategory) {
      return 'Explora por necesidad: nutricion, higiene, salud, accesorios, habitats y otras soluciones del catalogo.';
    }

    return `${this.resolveCategoryNote(selectedCategory)} Esta vista sigue siendo solo una parte del catalogo completo.`;
  }

  get selectedPetTemplateTags(): string[] {
    return this.selectedPetProfile ? this.buildPetTemplateTags(this.selectedPetProfile) : [];
  }

  get selectedPetTypeIcon(): string {
    return this.resolvePetIcon(this.selectedPetType);
  }

  get petTemplateOptions(): Array<{ id: string | null; name: string; meta: string; tags: string[]; isAll?: boolean }> {
    return [
      {
        id: null,
        name: 'Todas mis mascotas',
        meta: 'Mantiene solo el contexto general de la tienda.',
        tags: this.currentPetConfig ? [this.currentPetConfig.label] : ['Catalogo abierto'],
        isAll: true,
      },
      ...this.pets.map((pet) => ({
        id: String(pet.id),
        name: pet.name,
        meta: this.buildPetMeta(pet),
        tags: this.buildPetTemplateTags(pet),
      })),
    ];
  }

  onSearchSubmit(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    this.page = 1;
    this.navigateWith({
      petType: this.selectedPetType,
      tag: this.collectionTag,
      page: 1,
      sort: this.sort,
      search: this.searchDraft.trim() || null,
      min: this.filters.min ?? null,
      max: this.filters.max ?? null,
      stock: this.filters.inStockOnly ? 'in' : 'all',
      pet: this.filters.petId || null,
      cat: this.filters.category || null,
      sub: this.filters.subcategory || null,
      brand: this.filters.brandId ?? null,
      form: this.filters.form || null,
      protein: this.filters.proteinSource || null,
      specie: this.filters.specieId ?? null,
      stage: this.filters.lifeStageId ?? null,
      diet: this.filters.dietTagId ?? null,
      health: this.filters.healthConditionId ?? null,
      ingredient: this.filters.ingredientId ?? null,
    });
  }

  toggleDiscovery(): void {
    this.discoveryOpen = !this.discoveryOpen;
  }

  onContextPathSelect(level: HeroPathStep['level']): void {
    if (level === 'family') {
      if (!this.filters.category && !this.filters.subcategory) {
        return;
      }

      this.clearCategoryFilter();
      return;
    }

    if (level === 'category' && this.filters.subcategory) {
      this.selectSubcategory('');
    }
  }

  selectCatalogPet(petType: CatalogPetType | null): void {
    this.page = 1;
    this.navigateWith({
      petType,
      tag: this.collectionTag,
      page: 1,
      sort: this.sort,
      search: this.search || undefined,
      min: this.filters.min ?? null,
      max: this.filters.max ?? null,
      stock: this.filters.inStockOnly ? 'in' : 'all',
      pet: null,
      cat: this.filters.category || null,
      sub: null,
      brand: this.filters.brandId ?? null,
      form: this.filters.form || null,
      protein: this.filters.proteinSource || null,
      specie: null,
      stage: null,
      diet: this.filters.dietTagId ?? null,
      health: this.filters.healthConditionId ?? null,
      ingredient: this.filters.ingredientId ?? null,
    });
  }

  setPetFilter(petId: string | null): void {
    const selectedPet = petId ? this.pets.find((pet) => String(pet.id) === petId) || null : null;
    const profilePetType = selectedPet ? this.resolveCatalogPetFromProfile(selectedPet) : this.selectedPetType;

    this.page = 1;
    this.navigateWith({
      petType: profilePetType,
      tag: this.collectionTag,
      page: 1,
      sort: this.sort,
      search: this.search || undefined,
      min: this.filters.min ?? null,
      max: this.filters.max ?? null,
      stock: this.filters.inStockOnly ? 'in' : 'all',
      pet: petId,
      cat: this.filters.category || null,
      sub: this.filters.subcategory || null,
      brand: this.filters.brandId ?? null,
      form: this.filters.form || null,
      protein: this.filters.proteinSource || null,
      specie: petId ? null : this.filters.specieId ?? null,
      stage: petId ? null : this.filters.lifeStageId ?? null,
      diet: this.filters.dietTagId ?? null,
      health: this.filters.healthConditionId ?? null,
      ingredient: this.filters.ingredientId ?? null,
    });
  }

  selectCategory(category: string): void {
    this.onApplyFilters({
      ...this.filters,
      category,
      subcategory: null,
    });
  }

  selectSubcategory(subcategory: string): void {
    this.onApplyFilters({
      ...this.filters,
      subcategory: subcategory || null,
    });
  }

  clearCategoryFilter(): void {
    this.onApplyFilters({
      ...this.filters,
      category: null,
      subcategory: null,
    });
  }

  onOpenFilters(): void {
    this.filtersOpen = true;
  }

  onCloseFilters(): void {
    this.filtersOpen = false;
  }

  onApplyFilters(next: FilterState): void {
    this.filtersOpen = false;
    this.page = 1;
    const min = this.normalizeFilterNumber(next.min);
    const max = this.normalizeFilterNumber(next.max);
    const petId = next.petId || null;

    this.navigateWith({
      petType: this.selectedPetType,
      tag: this.collectionTag,
      page: 1,
      sort: this.sort,
      search: this.search || undefined,
      min,
      max,
      stock: next.inStockOnly ? 'in' : 'all',
      pet: petId,
      cat: next.category || null,
      sub: next.subcategory || null,
      brand: next.brandId ?? null,
      form: next.form || null,
      protein: next.proteinSource || null,
      specie: petId ? null : next.specieId ?? null,
      stage: petId ? null : next.lifeStageId ?? null,
      diet: next.dietTagId ?? null,
      health: next.healthConditionId ?? null,
      ingredient: next.ingredientId ?? null,
    });
  }

  onClearFilters(): void {
    this.filtersOpen = false;
    this.page = 1;

    this.navigateWith({
      petType: this.selectedPetType,
      tag: this.collectionTag,
      page: 1,
      sort: this.sort,
      search: this.search || undefined,
      min: null,
      max: null,
      stock: 'in',
      pet: null,
      cat: null,
      sub: null,
      brand: null,
      form: null,
      protein: null,
      specie: null,
      stage: null,
      diet: null,
      health: null,
      ingredient: null,
    });
  }

  onSortChange(value: SortType): void {
    this.sort = value;
    this.page = 1;

    this.navigateWith({
      petType: this.selectedPetType,
      tag: this.collectionTag,
      page: 1,
      sort: value,
      search: this.search || undefined,
      min: this.filters.min ?? null,
      max: this.filters.max ?? null,
      stock: this.filters.inStockOnly ? 'in' : 'all',
      pet: this.filters.petId || null,
      cat: this.filters.category || null,
      sub: this.filters.subcategory || null,
      brand: this.filters.brandId ?? null,
      form: this.filters.form || null,
      protein: this.filters.proteinSource || null,
      specie: this.filters.specieId ?? null,
      stage: this.filters.lifeStageId ?? null,
      diet: this.filters.dietTagId ?? null,
      health: this.filters.healthConditionId ?? null,
      ingredient: this.filters.ingredientId ?? null,
    });
  }

  onPageChange(n: number): void {
    this.page = Number(n);

    this.navigateWith({
      petType: this.selectedPetType,
      tag: this.collectionTag,
      page: this.page,
      sort: this.sort,
      search: this.search || undefined,
      min: this.filters.min ?? null,
      max: this.filters.max ?? null,
      stock: this.filters.inStockOnly ? 'in' : 'all',
      pet: this.filters.petId || null,
      cat: this.filters.category || null,
      sub: this.filters.subcategory || null,
      brand: this.filters.brandId ?? null,
      form: this.filters.form || null,
      protein: this.filters.proteinSource || null,
      specie: this.filters.specieId ?? null,
      stage: this.filters.lifeStageId ?? null,
      diet: this.filters.dietTagId ?? null,
      health: this.filters.healthConditionId ?? null,
      ingredient: this.filters.ingredientId ?? null,
    });
  }

  onAddToCart(product: Product): void {
    this.cart.addItem(product.id, 1);
  }

  trackByProductId(_: number, product: Product): string {
    return product.id;
  }

  trackByPetId(_: number, pet: Pet): string {
    return pet.id;
  }

  private mapRouteState(
    slug: string | null,
    queryParams: any,
    species: StorefrontTaxonomyItem[]
  ): RouteState {
    const routePetType = this.normalizePetType(getCatalogPetBySlug(slug)?.key || null);
    const queryPetType = this.normalizePetType(queryParams.get('petType'));
    const petType = queryPetType || routePetType;
    const categoryFromQuery = this.normalizeCategoryParam(queryParams.get('cat'));
    const routeCategory = this.normalizeCategoryParam(this.normalizeRouteCategory(slug));
    const category = categoryFromQuery || routeCategory;

    this.speciesTaxonomy = species;

    return {
      slug,
      petType,
      tag: this.normalizeCollectionTag(queryParams.get('tag')),
      sort: (queryParams.get('sort') as SortType) || 'popular',
      page: +(queryParams.get('page') || 1),
      pageSize: +(queryParams.get('pageSize') || 12),
      search: (queryParams.get('search') || '').trim(),
      min: this.parseQueryNumber(queryParams.get('min')),
      max: this.parseQueryNumber(queryParams.get('max')),
      inStockOnly: (queryParams.get('stock') || 'in').toLowerCase() !== 'all',
      petId: (queryParams.get('pet') || '').trim() || null,
      category,
      subcategory: this.normalizeSubcategoryParam(queryParams.get('sub')),
      brandId: this.parseQueryNumber(queryParams.get('brand')),
      form: (queryParams.get('form') || '').trim() || null,
      proteinSource: (queryParams.get('protein') || '').trim() || null,
      specieId: this.parseQueryNumber(queryParams.get('specie')),
      lifeStageId: this.parseQueryNumber(queryParams.get('stage')),
      dietTagId: this.parseQueryNumber(queryParams.get('diet')),
      healthConditionId: this.parseQueryNumber(queryParams.get('health')),
      ingredientId: this.parseQueryNumber(queryParams.get('ingredient')),
    };
  }

  private fetchCatalog$() {
    const requestId = ++this.activeRequestId;

    this.applyState(() => {
      this.loading = true;
      this.errorMsg = '';
    });

    const selectedPet = this.filters.petId
      ? this.pets.find((pet) => String(pet.id) === this.filters.petId) || null
      : null;
    const petId = Number(this.filters.petId || 0);
    const excludedTerms = (selectedPet?.allergies || []).map((entry) => String(entry || '')).filter(Boolean);
    const query = this.buildCatalogQuery(excludedTerms);

    const result$ = this.hasPetProfiles && petId > 0
      ? this.api.searchByPetProfile(petId, query)
      : this.api.search(query);
    const facets$ = this.hasPetProfiles && petId > 0
      ? this.api.getFacets(query, petId)
      : this.api.getFacets(query);
    const hasExplicitPriceFilter = Number.isFinite(query.min as number) || Number.isFinite(query.max as number);
    const priceBoundsQuery: CatalogQuery = {
      ...query,
      min: undefined,
      max: undefined,
    };
    const priceBounds$ = hasExplicitPriceFilter
      ? (this.hasPetProfiles && petId > 0
          ? this.api.getFacets(priceBoundsQuery, petId)
          : this.api.getFacets(priceBoundsQuery))
      : of<StorefrontProductFacets | null>(null);

    return result$.pipe(
      tap((result) => {
        if (requestId !== this.activeRequestId) return;

        const fallbackFacets = this.withFallbackFacets(this.emptyFacets, result.items, result.total);
        const previousStableTotal = Number(this.facets.totalProducts || this.total || 0);
        const hasProvisionalFirstPageTotal =
          result.page === 1 &&
          result.items.length >= result.pageSize &&
          result.total === result.pageSize + 1;
        this.applyState(() => {
          this.items = result.items;
          this.total = hasProvisionalFirstPageTotal && previousStableTotal > result.total
            ? previousStableTotal
            : result.total;
          this.facets = fallbackFacets;
          this.navFacets = fallbackFacets;
          if (!hasExplicitPriceFilter) {
            this.priceRangeBounds = this.extractPriceRangeBounds(fallbackFacets);
          }
          this.subcategoryChipList = this.computeSubcategoryChips();
          this.loading = false;
        });
        this.applyCollectionSeo(result.total);
      }),
      switchMap((result) =>
        forkJoin({
          facets: facets$,
          priceBoundsFacets: priceBounds$,
        }).pipe(
          tap(({ facets, priceBoundsFacets }) => {
            if (requestId !== this.activeRequestId) return;

            const resolvedFacets = this.withFallbackFacets(facets, result.items, result.total);
            this.applyState(() => {
              const facetsTotal = Number(resolvedFacets.totalProducts || 0);
              this.total = facetsTotal > 0 ? facetsTotal : result.total;
              this.facets = resolvedFacets;
              this.navFacets = resolvedFacets;
              this.priceRangeBounds = this.extractPriceRangeBounds(priceBoundsFacets || resolvedFacets);
              this.subcategoryChipList = this.computeSubcategoryChips();
            });
          }),
          catchError(() => EMPTY)
        )
      ),
      catchError((error) => {
        if (requestId !== this.activeRequestId) {
          return EMPTY;
        }

        const apiError = error as AppHttpError;
        this.applyState(() => {
          this.errorMsg = apiError?.message || 'No pudimos cargar la tienda.';
          this.items = [];
          this.total = 0;
          this.facets = this.emptyFacets;
          this.navFacets = this.emptyFacets;
          this.priceRangeBounds = null;
          this.subcategoryChipList = [];
          this.loading = false;
        });
        this.applyCollectionSeo(0, apiError?.message || 'No pudimos cargar la tienda.');

        return EMPTY;
      })
    );
  }

  private applyState(update: () => void): void {
    const runUpdate = () => {
      update();

      // Ensure the view refreshes even if an async callback reaches us outside Angular's tick cycle.
      queueMicrotask(() => {
        const viewRef = this.cdr as ViewRef;
        if (!viewRef.destroyed) {
          this.cdr.detectChanges();
        }
      });
    };

    if (NgZone.isInAngularZone()) {
      runUpdate();
      return;
    }

    this.zone.run(runUpdate);
  }

  private buildCatalogQuery(excludedTerms: string[]): CatalogQuery {
    const selectedCategory = this.normalizeCategoryParam(this.filters.category || this.normalizeRouteCategory(this.slug));
    const selectedCategoryTaxonomy = this.findCategoryTaxonomyByValue(selectedCategory);
    const selectedSubcategoryTaxonomy = this.findSubcategoryTaxonomyByValue(this.filters.subcategory);
    const backendSubcategory = selectedSubcategoryTaxonomy?.label
      || this.normalizeSubcategoryParam(this.filters.subcategory)
      || undefined;
    const backendCategory = this.normalizeCategoryParam(selectedCategoryTaxonomy?.legacyCategory || selectedCategory) || undefined;
    const familySpecieId = this.resolvePetTypeSpecieId(this.selectedPetType);
    const explicitSpecieId = this.lockBiologyFilters
      ? undefined
      : familySpecieId ?? this.filters.specieId ?? undefined;

    return {
      category: backendCategory,
      subcategory: backendSubcategory,
      allowedSubcategories: [],
      collectionTag: this.collectionTag,
      min: this.filters.min ?? undefined,
      max: this.filters.max ?? undefined,
      sort: this.sort,
      page: this.page,
      pageSize: this.pageSize,
      search: this.search,
      inStock: this.filters.inStockOnly ? true : false,
      strictPet: true,
      excludedTerms,
      form: this.filters.form ?? undefined,
      proteinSource: this.filters.proteinSource ?? undefined,
      brandId: this.filters.brandId ?? undefined,
      specieId: explicitSpecieId ?? undefined,
      lifeStageId: this.lockBiologyFilters ? undefined : this.filters.lifeStageId ?? undefined,
      dietTagIds: this.filters.dietTagId ? [this.filters.dietTagId] : [],
      healthConditionIds: this.filters.healthConditionId ? [this.filters.healthConditionId] : [],
      ingredientIds: this.filters.ingredientId ? [this.filters.ingredientId] : [],
    };
  }

  private navigateWith(query: NavQuery): void {
    const qp: Params = {};

    if (query.petType !== undefined) qp['petType'] = query.petType;
    if (query.tag !== undefined) qp['tag'] = query.tag;
    if (query.sort !== undefined) qp['sort'] = query.sort;
    if (query.page !== undefined) qp['page'] = query.page;
    if (query.pageSize !== undefined) qp['pageSize'] = query.pageSize;
    if (query.search !== undefined) qp['search'] = query.search;
    if (query.min !== undefined) qp['min'] = query.min;
    if (query.max !== undefined) qp['max'] = query.max;
    if (query.stock !== undefined) qp['stock'] = query.stock;
    if (query.pet !== undefined) qp['pet'] = query.pet;
    if (query.cat !== undefined) qp['cat'] = query.cat;
    if (query.sub !== undefined) qp['sub'] = query.sub;
    if (query.brand !== undefined) qp['brand'] = query.brand;
    if (query.form !== undefined) qp['form'] = query.form;
    if (query.protein !== undefined) qp['protein'] = query.protein;
    if (query.specie !== undefined) qp['specie'] = query.specie;
    if (query.stage !== undefined) qp['stage'] = query.stage;
    if (query.diet !== undefined) qp['diet'] = query.diet;
    if (query.health !== undefined) qp['health'] = query.health;
    if (query.ingredient !== undefined) qp['ingredient'] = query.ingredient;

    const current = this.route.snapshot.queryParams;
    const currentSignature = this.buildParamsSignature(current);
    const nextSignature = this.buildParamsSignature(qp);

    if (currentSignature === nextSignature) {
      return;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: qp,
      queryParamsHandling: 'merge',
    });
  }

  private normalizeRouteCategory(slug: string | null): string | null {
    const value = String(slug || '').trim().toLowerCase();
    if (!value || value === 'catalog' || getCatalogPetBySlug(value)) return null;

    if (value === 'snacks') return 'treats';
    if (value === 'higiene') return 'hygiene';
    if (value === 'salud') return 'health';
    if (value === 'juguetes' || value === 'accesorios' || value === 'accesories') return 'accesories';
    if (value === 'alimento' || value === 'comida') return 'food';
    return null;
  }

  private normalizeCategoryParam(value?: string | null): string | null {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return null;

    const map: Record<string, string> = {
      food: 'food',
      alimentacion: 'food',
      treats: 'treats',
      snack: 'treats',
      snacks: 'treats',
      health: 'health',
      salud: 'health',
      farmacia: 'health',
      hygiene: 'hygiene',
      higiene: 'hygiene',
      aseo: 'hygiene',
      grooming: 'hygiene',
      accesories: 'accesories',
      accessories: 'accesories',
      accesorios: 'accesories',
      juguetes: 'accesories',
      descanso: 'accesories',
      suministros: 'accesories',
      ropa: 'accesories',
      other: 'other',
      otros: 'other',
      all: '',
      todos: '',
    };

    if (Object.prototype.hasOwnProperty.call(map, normalized)) {
      return map[normalized] || null;
    }

    return normalized;
  }

  private normalizeSubcategoryParam(value?: string | null): string | null {
    const normalized = String(value || '')
      .trim()
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ');

    return normalized || null;
  }

  private normalizePetType(value?: string | null): CatalogPetType | null {
    const normalized = String(value || '').trim().toLowerCase();
    return getCatalogPetByKey(normalized)?.key || null;
  }

  private normalizeCollectionTag(value?: string | null): CatalogCollectionTag | null {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'new' || normalized === 'clearance') {
      return normalized;
    }

    return null;
  }

  private parseQueryNumber(value: string | null): number | null {
    if (value === null || value.trim() === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private normalizeFilterNumber(value?: number | null): number | null {
    if (value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private buildParamsSignature(params: Params): string {
    return Object.keys(params || {})
      .filter((key) => {
        const value = params[key];
        return value !== null && value !== undefined && value !== '';
      })
      .sort()
      .map((key) => {
        const value = params[key];
        return `${key}:${String(value)}`;
      })
      .join('|');
  }

  private applyCollectionSeo(totalProducts: number, errorMessage = ''): void {
    const title = `${this.pageTitle} | Aumakki`;
    const searchTerm = this.search.trim();
    const filterTags = [
      this.currentPetConfig?.label || '',
      this.filters.category ? this.resolveCategoryDisplayLabel(this.filters.category) : '',
      this.resolveSubcategoryDisplayLabel(this.filters.subcategory),
      this.resolveFacetLabel(this.facets.forms, this.filters.form),
      this.resolveFacetLabel(this.facets.proteinSources, this.filters.proteinSource),
      this.resolveTaxonomyLabel(this.facets.brands, this.filters.brandId),
      this.resolveTaxonomyLabel(this.facets.lifeStages, this.filters.lifeStageId),
      this.resolveTaxonomyLabel(this.facets.dietTags, this.filters.dietTagId),
      this.resolveTaxonomyLabel(this.facets.healthConditions, this.filters.healthConditionId),
      this.resolveTaxonomyLabel(this.facets.ingredients, this.filters.ingredientId),
    ].filter(Boolean);

    const description = errorMessage
      ? errorMessage
      : [
          `Explora ${Math.max(0, totalProducts)} productos.`,
          this.pageSubtitle,
          searchTerm ? `Busqueda activa: ${searchTerm}.` : '',
          filterTags.length ? `Contexto actual: ${filterTags.join(', ')}.` : '',
        ].filter(Boolean).join(' ');

    const topItems = this.items.slice(0, 8).map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: `/catalog/product/${item.slug}`,
    }));

    this.seo.setPage({
      title,
      description,
      url: this.router.url,
      type: 'website',
      keywords: [
        'tienda de mascotas',
        'ecommerce mascotas Guatemala',
        this.currentPetConfig?.label || '',
        ...filterTags,
        ...this.facets.subcategories.slice(0, 6).map((item) => item.label),
      ].filter((value): value is string => Boolean(value)),
      structuredData: [
        {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: title,
          description,
          url: this.router.url,
          about: this.currentPetConfig?.label || 'Mascotas',
        },
        {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: `${this.pageTitle} en Aumakki`,
          numberOfItems: totalProducts,
          itemListElement: topItems,
        },
      ],
    });
  }

  private resolveFacetLabel(
    items: Array<{ value: string; label: string }>,
    value?: string | null
  ): string {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return '';
    return items.find((item) => item.value.toLowerCase() === normalized)?.label || normalized;
  }

  private resolveTaxonomyLabel(
    items: Array<{ id: number; name?: string }>,
    value?: number | null
  ): string {
    const numeric = Number(value || 0);
    if (!numeric) return '';
    return items.find((item) => Number(item.id) === numeric)?.name || '';
  }

  private withFallbackFacets(
    facets: StorefrontProductFacets,
    items: Product[],
    totalProducts: number
  ): StorefrontProductFacets {
    const hasFacetData = [
      facets.categories.length,
      facets.subcategories.length,
      facets.brands.length,
      facets.forms.length,
      facets.proteinSources.length,
      facets.species.length,
      facets.lifeStages.length,
      facets.dietTags.length,
      facets.healthConditions.length,
      facets.ingredients.length,
    ].some((count) => count > 0);

    if (hasFacetData) {
      return {
        ...facets,
        subcategories: this.sortSubcategoryChips(facets.subcategories),
        totalProducts: facets.totalProducts || totalProducts,
      };
    }

    const categoryMap = new Map<string, { value: string; label: string; count: number }>();
    const subcategoryMap = new Map<string, { value: string; label: string; count: number }>();
    let min = Number.POSITIVE_INFINITY;
    let max = 0;

    for (const item of items) {
      const price = Number(item.price || 0);
      if (Number.isFinite(price) && price > 0) {
        min = Math.min(min, price);
        max = Math.max(max, price);
      }

      const categoryValue = String(item.category || '').trim().toLowerCase() as CatalogCategoryKey;
      if (categoryValue) {
        const found = categoryMap.get(categoryValue);
        if (found) {
          found.count += 1;
        } else {
          categoryMap.set(categoryValue, {
            value: categoryValue,
            label: getCatalogCategoryLabel(categoryValue, this.selectedPetType),
            count: 1,
          });
        }
      }

      const subcategoryValue = String(item.subcategory || '').trim();
      if (subcategoryValue) {
        const normalizedSubcategory = this.normalizeSubcategoryText(subcategoryValue);
        const found = subcategoryMap.get(normalizedSubcategory);
        if (found) {
          found.count += 1;
        } else {
          subcategoryMap.set(normalizedSubcategory, {
            value: subcategoryValue,
            label: subcategoryValue,
            count: 1,
          });
        }
      }
    }

    return {
      ...this.emptyFacets,
      categories: Array.from(categoryMap.values()).sort((a, b) => b.count - a.count),
      subcategories: this.sortSubcategoryChips(Array.from(subcategoryMap.values())),
      priceRange: {
        min: Number.isFinite(min) ? min : 0,
        max,
      },
      totalProducts,
    };
  }

  private extractPriceRangeBounds(
    facets: StorefrontProductFacets | null | undefined
  ): { min: number; max: number } | null {
    const min = Number(facets?.priceRange?.min ?? Number.NaN);
    const max = Number(facets?.priceRange?.max ?? Number.NaN);

    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return null;
    }

    const floor = Math.floor(min);
    const ceil = Math.ceil(max);

    return {
      min: Math.min(floor, ceil),
      max: Math.max(floor, ceil),
    };
  }

  private sortSubcategoryChips(
    items: Array<{ value: string; label: string; count: number }>
  ): Array<{ value: string; label: string; count: number }> {
    const selectedCategory = String(this.filters.category || this.normalizeRouteCategory(this.slug) || '').trim().toLowerCase();
    const taxonomySuggestions = (this.findCategoryTaxonomyByValue(selectedCategory)?.subcategories || [])
      .map((item) => this.normalizeSubcategoryText(item.label));
    const configSuggestions = (this.currentPetConfig?.subcategorySuggestions?.[selectedCategory as CatalogCategoryKey] || [])
      .map((item) => this.normalizeSubcategoryText(item));
    const suggestedOrder = taxonomySuggestions.length ? taxonomySuggestions : configSuggestions;

    return [...items].sort((a, b) => {
      const indexA = suggestedOrder.indexOf(this.normalizeSubcategoryText(a.label));
      const indexB = suggestedOrder.indexOf(this.normalizeSubcategoryText(b.label));

      if (indexA >= 0 || indexB >= 0) {
        if (indexA < 0) return 1;
        if (indexB < 0) return -1;
        if (indexA !== indexB) return indexA - indexB;
      }

      if (b.count !== a.count) return b.count - a.count;
      return a.label.localeCompare(b.label, 'es');
    });
  }

  private findCategoryTaxonomyByValue(value?: string | null): StorefrontCatalogTaxonomyCategory | null {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized || !this.activeAnimalTaxonomy?.categories?.length) return null;

    return this.activeAnimalTaxonomy.categories.find(
      (item) => item.slug === normalized || item.key === normalized || (item.legacyCategory || '').toLowerCase() === normalized
    ) || null;
  }

  private findSubcategoryTaxonomyByValue(value?: string | null): StorefrontCatalogTaxonomySubcategory | null {
    const normalized = this.normalizeSubcategoryText(value);
    if (!normalized || !this.selectedCategoryTaxonomy?.subcategories?.length) {
      return null;
    }

    return this.selectedCategoryTaxonomy.subcategories.find((item) => {
      const matches = this.normalizeSubcategoryTerms([
        item.slug,
        item.key,
        item.label,
        ...(item.matchTerms || []),
        ...(item.level4 || []).flatMap((leaf) => [
          leaf.slug,
          leaf.key,
          leaf.label,
          ...(leaf.matchTerms || []),
        ]),
      ]);

      return matches.includes(normalized);
    }) || null;
  }

  private resolveCategoryDisplayLabel(value?: string | null): string {
    const taxonomyCategory = this.findCategoryTaxonomyByValue(value);
    if (taxonomyCategory) {
      return taxonomyCategory.label;
    }

    return getCatalogCategoryLabel((value as CatalogCategoryKey) || 'other', this.selectedPetType);
  }

  private resolveSubcategoryDisplayLabel(value?: string | null): string {
    const taxonomySubcategory = this.findSubcategoryTaxonomyByValue(value);
    if (taxonomySubcategory) {
      return taxonomySubcategory.label;
    }

    const normalized = this.normalizeSubcategoryText(value);
    if (!normalized) {
      return '';
    }

    return normalized
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private resolveCategoryCount(
    value: string,
    legacyCounts: Map<string, number>
  ): number {
    const taxonomyCategory = this.findCategoryTaxonomyByValue(value);
    if (!taxonomyCategory) {
      return legacyCounts.get(value) || 0;
    }

    const allowed = new Set(this.collectTaxonomySubcategoryLabels(taxonomyCategory));

    const directCount = (this.navFacets.subcategories || []).reduce((sum, item) => {
      const normalized = this.normalizeSubcategoryText(item.label || item.value || '');
      return allowed.has(normalized) ? sum + Number(item.count || 0) : sum;
    }, 0);

    if (directCount > 0) {
      return directCount;
    }

    return legacyCounts.get(String(taxonomyCategory.legacyCategory || '').toLowerCase()) || 0;
  }

  private filterSubcategoriesForSelectedCategory(
    items: Array<{ value: string; label: string; count: number }>
  ): Array<{ value: string; label: string; count: number }> {
    const taxonomyCategory = this.selectedCategoryTaxonomy;
    if (!taxonomyCategory) {
      return items;
    }

    const allowed = new Set(this.collectTaxonomySubcategoryLabels(taxonomyCategory));
    return items.filter((item) => allowed.has(this.normalizeSubcategoryText(item.label || item.value || '')));
  }

  private collectTaxonomySubcategoryLabels(category: StorefrontCatalogTaxonomyCategory): string[] {
    return Array.from(
      new Set(
        (category.subcategories || [])
          .flatMap((item) => this.collectSubcategoryTerms(item))
          .map((item) => this.normalizeSubcategoryText(item))
          .filter(Boolean)
      )
    );
  }

  private collectSubcategoryTerms(subcategory: StorefrontCatalogTaxonomySubcategory): string[] {
    return this.normalizeSubcategoryTerms([
      subcategory.slug,
      subcategory.key,
      subcategory.label,
      ...(subcategory.matchTerms || []),
      ...(subcategory.level4 || []).flatMap((leaf) => [
        leaf.slug,
        leaf.key,
        leaf.label,
        ...(leaf.matchTerms || []),
      ]),
    ]);
  }

  private countFacetMatchesForTerms(
    items: Array<{ value: string; label: string; count: number }>,
    terms: string[]
  ): number {
    if (!terms.length) {
      return 0;
    }

    const termSet = new Set(terms.map((term) => this.normalizeSubcategoryText(term)).filter(Boolean));
    return (items || []).reduce((sum, item) => {
      const normalized = this.normalizeSubcategoryText(item.label || item.value || '');
      return termSet.has(normalized) ? sum + Number(item.count || 0) : sum;
    }, 0);
  }

  private normalizeSubcategoryText(value?: string | null): string {
    return String(value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ');
  }

  private normalizeSubcategoryTerms(values: Array<string | null | undefined>): string[] {
    return Array.from(
      new Set(
        (values || [])
          .map((value) => this.normalizeSubcategoryText(value))
          .filter(Boolean)
      )
    );
  }

  private isDrawerFacetControlKey(value: string | null): value is DrawerFacetControlKey {
    return value === 'form'
      || value === 'proteinSource'
      || value === 'specieId'
      || value === 'lifeStageId'
      || value === 'dietTagId'
      || value === 'healthConditionId'
      || value === 'ingredientId';
  }

  private resolvePetTypeSpecieId(petType: CatalogPetType | null): number | undefined {
    if (!petType) return undefined;

    const taxonomyItem = this.speciesTaxonomy.find((item) => {
      const match = matchCatalogPetFromTaxonomy([item.slug || '', item.name || '']);
      return match?.key === petType;
    });

    return taxonomyItem?.id;
  }

  resolveCatalogPetFromProfile(pet: Pet): CatalogPetType | null {
    if (pet.species === 'dog') return 'dog';
    if (pet.species === 'cat') return 'cat';
    if (pet.species === 'bird') return 'bird';
    if (pet.species === 'fish') return 'fish';
    if (pet.species === 'reptile') return 'reptile';
    if (pet.species === 'small-pet') return 'small-pet';
    return null;
  }

  private buildPetMeta(pet: Pet): string {
    const parts = [
      SPECIES_LABEL[pet.species],
      pet.lifeStage ? LIFESTAGE_LABEL[pet.lifeStage] : '',
      pet.size ? SIZE_LABEL[pet.size] : '',
      Number.isFinite(Number(pet.weightKg)) ? `${Number(pet.weightKg)} kg` : '',
    ].filter(Boolean);

    return parts.join(' | ') || 'Perfil listo para personalizar el catalogo.';
  }

  private buildPetTemplateTags(pet: Pet): string[] {
    const tags = [
      pet.lifeStage ? `Etapa: ${LIFESTAGE_LABEL[pet.lifeStage]}` : '',
      pet.diet?.[0] ? DIET_LABEL[pet.diet[0]] : '',
      pet.diet?.[1] ? DIET_LABEL[pet.diet[1]] : '',
      pet.allergies?.[0] ? `Evitar ${pet.allergies[0]}` : '',
      pet.allergies?.[1] ? `Evitar ${pet.allergies[1]}` : '',
    ].filter(Boolean);

    return Array.from(new Set(tags)).slice(0, 4);
  }

  private resolveCategoryPreviewTags(category: string): string[] {
    const taxonomyCategory = this.findCategoryTaxonomyByValue(category);
    if (taxonomyCategory?.subcategories?.length) {
      return taxonomyCategory.subcategories.slice(0, 3).map((item) => item.label);
    }

    const petSuggestions = this.currentPetConfig?.subcategorySuggestions?.[category as CatalogCategoryKey] || [];
    if (petSuggestions.length) {
      return petSuggestions.slice(0, 3);
    }

    const fallback: Record<CatalogCategoryKey, string[]> = {
      food: ['Nutricion', 'Formulas', 'Especialidades'],
      treats: ['Premios', 'Entrenamiento', 'Refuerzo'],
      hygiene: ['Limpieza', 'Cama', 'Cuidado'],
      health: ['Suplementos', 'Soporte', 'Bienestar'],
      accesories: ['Habitat', 'Juego', 'Descanso'],
      other: ['Complementos', 'Temporadas', 'Especiales'],
    };

    return fallback[category as CatalogCategoryKey] || [];
  }

  private resolveCategoryNote(category: string): string {
    const taxonomyCategory = this.findCategoryTaxonomyByValue(category);
    if (taxonomyCategory?.description) {
      return taxonomyCategory.description;
    }

    const notes: Record<CatalogCategoryKey, string> = {
      food: 'Nutricion diaria, formulas funcionales y opciones segun especie o etapa.',
      treats: 'Premios, snacks y soluciones utiles para entrenamiento o enriquecimiento.',
      hygiene: 'Limpieza, arena, sustratos, cama y cuidado de uso frecuente.',
      health: 'Bienestar, suplementos y apoyo para objetivos concretos de salud.',
      accesories: 'Habitats, paseo, juego, descanso y equipo para el dia a dia.',
      other: 'Complementos, temporadas y soluciones que no caben en una sola familia.',
    };

    return notes[category as CatalogCategoryKey] || 'Necesidades especificas dentro del contexto actual del catalogo.';
  }

  resolveCategoryIcon(category: string | null | undefined): string {
    const map: Record<string, string> = {
      food: 'restaurant',
      alimentacion: 'restaurant',
      treats: 'bakery_dining',
      farmacia: 'health_and_safety',
      suplementos: 'health_and_safety',
      'cuidado-rutinario': 'health_and_safety',
      hygiene: 'soap',
      higiene: 'soap',
      aseo: 'soap',
      grooming: 'content_cut',
      sustrato: 'layers',
      cuidado: 'soap',
      health: 'health_and_safety',
      accesories: 'toys',
      accesorios: 'pets',
      jaulas: 'home',
      habitat: 'home',
      equipo: 'sports_martial_arts',
      acuarios: 'water',
      areneros: 'cleaning_services',
      rascadores: 'dashboard',
      juguetes: 'toys',
      descanso: 'hotel',
      ropa: 'checkroom',
      equipamiento: 'precision_manufacturing',
      decoracion: 'park',
      suministros: 'inventory_2',
      other: 'inventory_2',
    };

    return category ? (map[String(category).toLowerCase()] || 'inventory_2') : 'apps';
  }

  resolvePetIcon(petType: CatalogPetType | null | undefined): string {
    const map: Partial<Record<CatalogPetType, string>> = {
      dog: 'pets',
      cat: 'pets',
      bird: 'flutter_dash',
      fish: 'water',
      reptile: 'cruelty_free',
      'small-pet': 'pest_control_rodent',
      horse: 'agriculture',
    };

    return petType ? (map[petType] || 'pets') : 'pets';
  }
}
