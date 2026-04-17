import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Observable, Subject, of } from 'rxjs';
import { catchError, filter, take, takeUntil } from 'rxjs/operators';
import { AuthService, AuthUser } from '../../auth/services/auth.service';
import {
  StorefrontCatalogTaxonomyAnimal,
  StorefrontCatalogTaxonomyCategory,
  StorefrontCatalogTaxonomySubcategory,
  StorefrontHeaderAnnouncement,
  StorefrontMedia
} from '../../core/models/storefront.models';
import { StorefrontApiService } from '../../core/services/storefront-api.service';
import {
  CatalogPetType,
  getCatalogPetByKey,
  getCatalogPetBySlug,
} from '../../features/catalog/catalog-taxonomy.utils';
import { CartItem } from '../../features/cart/models/cart.model';
import { CartStateService } from '../../features/cart/services/cart-state.service';

type CatalogShortcutKey = 'clearance' | 'new';
type ExploreFamilyKey = CatalogPetType;

interface ExploreSubcategoryEntry {
  slug: string;
  label: string;
}

interface ExploreCategoryEntry {
  slug: string;
  label: string;
  icon: string;
  description: string;
  image?: StorefrontMedia | null;
  legacyCategory?: string | null;
  subcategories: ExploreSubcategoryEntry[];
}

interface ExploreAnimalEntry {
  key: CatalogPetType;
  label: string;
  icon: string;
  headline: string;
  subtitle: string;
  searchHint: string;
  description: string;
  image?: StorefrontMedia | null;
  categories: ExploreCategoryEntry[];
}

interface ExploreFamilyEntry {
  key: ExploreFamilyKey;
  label: string;
  animals: ExploreAnimalEntry[];
}

interface ExplorePromoCard {
  imageUrl: string;
  imageAlt: string;
}

interface CatalogBreadcrumbStep {
  level: 'family' | 'category' | 'subcategory';
  label: string;
  clickable: boolean;
}

@Component({
  standalone: false,
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy, AfterViewInit {
  private readonly transientMessageMs = 3000;
  private readonly compactViewportBreakpoint = 980;
  private readonly catalogDropdownWidth = 560;
  private readonly fallbackPromoMessages = [
    'Envío gratis en compras seleccionadas',
    'Ahorra más con tus favoritos del mes',
    'Personaliza recomendaciones con el perfil de tu mascota',
  ];

  isLoggedIn = false;
  currentUser: AuthUser | null = null;
  membershipTier: 'free' | 'premium' = 'free';
  userMenuOpen = false;

  private readonly OPS_ROLES = ['admin', 'operator', 'superadmin'];

  get isOpsUser(): boolean {
    return this.OPS_ROLES.includes(this.currentUser?.role?.type ?? '');
  }
  isLoggingOut = false;
  sessionToastMessage = '';
  sessionToastIcon = 'check_circle';
  sessionToastType: 'success' | 'error' = 'success';
  showSessionToast = false;

  private readonly destroy$ = new Subject<void>();
  private logoutTimer: ReturnType<typeof setTimeout> | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  showSearch = false;
  searchQuery = '';
  mobileMenuOpen = false;
  isCatalogRoute = false;
  isCompactViewport = false;
  exploreDrawerOpen = false;
  activeExploreFamilyKey: ExploreFamilyKey | null = null;
  activeExploreAnimalKey: CatalogPetType | null = null;
  activeExploreCategorySlug: string | null = null;
  currentCatalogFamilyKey: CatalogPetType | null = null;
  currentCatalogCategoryKey: string | null = null;
  currentCatalogSubcategoryKey: string | null = null;
  currentCatalogTag: CatalogShortcutKey | null = null;
  catalogSearchQuery = '';
  catalogMenuOffset = 0;
  catalogMenuFlip = false;
  catalogAnimals: StorefrontCatalogTaxonomyAnimal[] = [];
  exploreAnimals: ExploreAnimalEntry[] = [];
  exploreFamilies: ExploreFamilyEntry[] = [];

  @ViewChild('catalogFamiliesRow') catalogFamiliesRow?: ElementRef<HTMLDivElement>;
  @ViewChild('catalogTree') catalogTree?: ElementRef<HTMLDivElement>;
  @ViewChildren('catalogFamilyButton') catalogFamilyButtons?: QueryList<ElementRef<HTMLButtonElement>>;

  navLinks = [
    { label: 'Inicio', path: '/home', exact: true },
    { label: 'Tienda', path: '/catalog' },
    { label: 'Membresía', path: '/memberships' },
    { label: 'Acerca de', path: '/about' },
  ];

  items$: Observable<CartItem[]> = this.cart.items$;
  count$: Observable<number> = this.cart.itemCount$;
  subtotal$: Observable<number> = this.cart.subtotal$;
  shipping$: Observable<number> = this.cart.shipping$;
  total$: Observable<number> = this.cart.total$;
  freeProgress$: Observable<number> = this.cart.freeProgress$;
  freeRemaining$: Observable<number> = this.cart.freeRemaining$;

  miniCartOpen = false;
  miniCartCoupon = '';

  private allPromoAnnouncements: StorefrontHeaderAnnouncement[] = [];
  promoMessages: string[] = [...this.fallbackPromoMessages];
  readonly catalogShortcuts: Array<{ key: CatalogShortcutKey; label: string; icon: string }> = [
    { key: 'clearance', label: 'Ofertas', icon: 'local_offer' },
    { key: 'new', label: 'Nuevos ingresos', icon: 'new_releases' },
  ];

  constructor(
    private eRef: ElementRef,
    private router: Router,
    private cart: CartStateService,
    private auth: AuthService,
    private storefrontApi: StorefrontApiService
  ) {}

  ngOnInit(): void {
    this.syncViewportState();
    this.closeTransientPanels();
    this.updateRouteContext(this.router.url);

    this.auth.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        this.currentUser = user;
        this.isLoggedIn = !!user;
        this.syncPromoAudience();
      });

    this.router.events
      .pipe(
        takeUntil(this.destroy$),
        filter((event): event is NavigationEnd => event instanceof NavigationEnd)
      )
      .subscribe((event) => {
        this.closeTransientPanels();
        this.updateRouteContext(event.urlAfterRedirects || event.url);
      });

    this.cart.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe((notification) => {
        this.pushSessionToast(
          notification.message,
          notification.type === 'error' ? 'error' : 'shopping_bag',
          notification.type
        );
      });

    this.cart.coupon$
      .pipe(takeUntil(this.destroy$))
      .subscribe((coupon) => {
        this.miniCartCoupon = coupon || '';
      });

    this.loadPromoMessages();
    this.refreshExploreAnimals();
    this.loadCatalogNavigation();
  }

  ngAfterViewInit(): void {
    this.catalogFamilyButtons?.changes
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.syncCatalogMenuPosition();
      });

    queueMicrotask(() => this.syncCatalogMenuPosition());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.logoutTimer) clearTimeout(this.logoutTimer);
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  get greetingName(): string {
    if (!this.currentUser) return 'Usuario';

    const source = (this.currentUser.username || this.currentUser.email || '').trim();
    const normalized = source
      .split('@')[0]
      .replace(/[._-]+/g, ' ')
      .trim();

    const firstToken = normalized.split(/\s+/).filter(Boolean)[0] || 'Usuario';
    return firstToken.charAt(0).toUpperCase() + firstToken.slice(1).toLowerCase();
  }

  get promoAudience(): 'guest' | 'account' | 'member' {
    if (!this.isLoggedIn) return 'guest';
    return this.membershipTier === 'premium' ? 'member' : 'account';
  }

  onUserIconClick(): void {
    if (this.isLoggingOut) return;
    this.userMenuOpen = !this.userMenuOpen;
  }

  closeTransientPanels(): void {
    this.userMenuOpen = false;
    this.miniCartOpen = false;
    this.mobileMenuOpen = false;
    this.showSearch = false;
    this.closeExploreDrawer();
  }

  onUserMenuSelect(option: string): void {
    if (option !== 'logout') {
      this.userMenuOpen = false;
    }

    switch (option) {
      case 'ops-portal':
        this.router.navigate(['/gx-ops']);
        break;
      case 'profile':
        this.router.navigate(['/account/profile']);
        break;
      case 'orders':
        this.router.navigate(['/account/orders']);
        break;
      case 'pets':
        this.router.navigate(['/account/pets']);
        break;
      case 'membership':
        this.router.navigate(['/account/membership']);
        break;
      case 'login':
        this.goToLogin();
        break;
      case 'register':
        this.goToRegister();
        break;
      case 'logout':
        this.beginLogout();
        break;
    }
  }

  toggleSearch(): void {
    if (this.showSearch && this.searchQuery.trim()) {
      this.onSearchSubmit();
      return;
    }

    this.showSearch = !this.showSearch;
    if (!this.showSearch) this.searchQuery = '';
  }

  onSearchSubmit(): void {
    const search = this.searchQuery.trim();
    this.closeTransientPanels();
    this.router.navigate(['/catalog'], {
      queryParams: {
        search: search || null,
        page: 1,
      },
    });
    this.showSearch = false;
  }

  toggleMobileMenu(): void {
    this.closeExploreDrawer();
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  toggleMiniCart(): void {
    this.miniCartOpen = !this.miniCartOpen;
  }

  closeMiniCart(): void {
    this.miniCartOpen = false;
  }

  toggleExploreDrawer(): void {
    this.exploreDrawerOpen = !this.exploreDrawerOpen;
    if (this.exploreDrawerOpen) {
      this.bootstrapExploreExpansion();
    } else {
      this.resetExploreExpansion();
    }

    this.userMenuOpen = false;
    this.miniCartOpen = false;
    this.mobileMenuOpen = false;
  }

  closeExploreDrawer(): void {
    this.exploreDrawerOpen = false;
    this.resetExploreExpansion();
  }

  setExploreAnimal(key: CatalogPetType): void {
    if (this.activeExploreAnimalKey === key) {
      return;
    }

    this.activeExploreFamilyKey = key;
    this.activeExploreAnimalKey = key;
    const firstCategory = this.activeExploreCategories[0];
    this.activeExploreCategorySlug = firstCategory?.slug || null;
  }

  isExploreAnimalActive(key: CatalogPetType): boolean {
    return this.activeExploreAnimalKey === key;
  }

  get activeExploreFamily(): ExploreFamilyEntry | null {
    return this.exploreFamilies.find((family) => family.key === this.activeExploreFamilyKey) || null;
  }

  setExploreCategory(categorySlug: string): void {
    this.activeExploreCategorySlug = String(categorySlug || '').trim().toLowerCase() || null;
  }

  isExploreCategoryActive(categorySlug: string): boolean {
    const active = this.activeExploreCategory;
    if (!active) return false;
    return active.slug === String(categorySlug || '').trim().toLowerCase();
  }

  get activeExploreAnimal(): ExploreAnimalEntry | null {
    return this.exploreAnimals.find((animal) => animal.key === this.activeExploreAnimalKey) || null;
  }

  get activeExploreOtherAnimals(): ExploreAnimalEntry[] {
    return [];
  }

  get activeExploreCategories(): ExploreCategoryEntry[] {
    return this.activeExploreAnimal?.categories || [];
  }

  get activeExploreCategory(): ExploreCategoryEntry | null {
    const categories = this.activeExploreCategories;
    if (!categories.length) {
      return null;
    }

    const normalizedSlug = String(this.activeExploreCategorySlug || '').trim().toLowerCase();
    return categories.find((category) => category.slug === normalizedSlug) || categories[0];
  }

  get activeExploreSubcategories(): ExploreSubcategoryEntry[] {
    return this.activeExploreCategory?.subcategories || [];
  }

  get activeExplorePromo(): ExplorePromoCard | null {
    const animal = this.activeExploreAnimal;
    if (!animal) return null;

    const category = this.activeExploreCategory;
    const media = category?.image || animal.image || null;

    return {
      imageUrl: this.resolveExplorePromoImage(media),
      imageAlt: media?.alternativeText || `${category?.label || animal.label} para ${animal.label}`,
    };
  }

  get currentCatalogAnimal(): ExploreAnimalEntry | null {
    return this.exploreAnimals.find((animal) => animal.key === this.currentCatalogFamilyKey) || null;
  }

  get currentCatalogCategory(): ExploreCategoryEntry | null {
    if (!this.currentCatalogCategoryKey) {
      return null;
    }

    const normalized = String(this.currentCatalogCategoryKey || '').trim().toLowerCase();
    const pools = this.currentCatalogAnimal ? [this.currentCatalogAnimal] : this.exploreAnimals;

    for (const animal of pools) {
      const match = animal.categories.find(
        (category) => category.slug === normalized || category.legacyCategory === normalized
      );
      if (match) {
        return match;
      }
    }

    return null;
  }

  get currentCatalogSubcategory(): ExploreSubcategoryEntry | null {
    const category = this.currentCatalogCategory;
    const normalized = String(this.currentCatalogSubcategoryKey || '').trim().toLowerCase();
    if (!category || !normalized) {
      return null;
    }

    return category.subcategories.find((subcategory) => subcategory.slug === normalized) || null;
  }

  get catalogBreadcrumbSteps(): CatalogBreadcrumbStep[] {
    const category = this.currentCatalogCategory;
    const subcategory = this.currentCatalogSubcategory;
    const familyLabel = this.currentCatalogAnimal?.label || this.getCatalogFallbackLabel();
    const steps: CatalogBreadcrumbStep[] = [
      {
        level: 'family',
        label: familyLabel,
        clickable: Boolean(category || subcategory),
      },
    ];

    if (category) {
      steps.push({
        level: 'category',
        label: category.label,
        clickable: Boolean(subcategory),
      });
    }

    if (subcategory) {
      steps.push({
        level: 'subcategory',
        label: subcategory.label,
        clickable: false,
      });
    }

    return steps;
  }

  get showCatalogBreadcrumbs(): boolean {
    return Boolean(this.currentCatalogCategory);
  }

  get catalogSearchPlaceholder(): string {
    return this.currentCatalogAnimal?.searchHint || 'Buscar productos, marcas o necesidades';
  }

  trackByExploreFamily(_: number, family: ExploreFamilyEntry): ExploreFamilyKey {
    return family.key;
  }

  trackByExploreAnimal(_: number, animal: ExploreAnimalEntry): CatalogPetType {
    return animal.key;
  }

  trackByExploreCategory(_: number, category: ExploreCategoryEntry): string {
    return category.slug;
  }

  trackByExploreSubcategory(_: number, subcategory: ExploreSubcategoryEntry): string {
    return subcategory.slug;
  }

  goToCatalogShortcut(kind: CatalogShortcutKey): void {
    this.closeExploreDrawer();
    this.closeMobileMenu();
    this.navigateCatalogContext({
      tag: kind,
      sort: kind === 'new' ? 'new' : 'popular',
      stock: 'in',
      page: '1',
    });
  }

  selectExploreCategory(animal: ExploreAnimalEntry, category: ExploreCategoryEntry): void {
    this.closeExploreDrawer();
    this.closeMobileMenu();
    const backendCategory = String(category.legacyCategory || category.slug || '').trim().toLowerCase() || null;
    this.navigateCatalogContext({
      cat: backendCategory,
      sub: null,
      page: '1',
    }, animal.key, { resetPetTemplate: animal.key !== this.currentCatalogFamilyKey });
  }

  selectCatalogFamilyRoot(animal: ExploreAnimalEntry): void {
    this.closeExploreDrawer();
    this.closeMobileMenu();
    this.navigateCatalogContext({
      cat: null,
      sub: null,
      page: '1',
    }, animal.key, { resetPetTemplate: animal.key !== this.currentCatalogFamilyKey });
  }

  toggleCatalogFamily(key: ExploreFamilyKey): void {
    const isSameFamily = this.activeExploreFamilyKey === key;
    const willClose = this.exploreDrawerOpen && isSameFamily;

    this.userMenuOpen = false;
    this.miniCartOpen = false;
    this.mobileMenuOpen = false;

    if (willClose) {
      this.closeExploreDrawer();
      return;
    }

    this.exploreDrawerOpen = true;
    this.activeExploreFamilyKey = key;
    this.activeExploreAnimalKey = key;
    this.activeExploreCategorySlug = this.resolvePreferredCategorySlug(this.activeExploreAnimalKey);
    queueMicrotask(() => this.syncCatalogMenuPosition());
  }

  isCatalogFamilyActive(key: ExploreFamilyKey): boolean {
    return this.activeExploreFamilyKey === key && this.exploreDrawerOpen;
  }

  isCatalogFamilyCurrent(key: ExploreFamilyKey): boolean {
    return this.currentCatalogFamilyKey === key;
  }

  isCatalogShortcutActive(key: CatalogShortcutKey): boolean {
    return this.currentCatalogTag === key;
  }

  onCatalogPathSelect(level: CatalogBreadcrumbStep['level']): void {
    this.closeExploreDrawer();

    if (level === 'family') {
      this.navigateCatalogContext({
        cat: null,
        sub: null,
        page: '1',
      });
      return;
    }

    if (level === 'category' && this.currentCatalogCategory) {
      this.navigateCatalogContext({
        cat: this.currentCatalogCategory.legacyCategory || this.currentCatalogCategory.slug,
        sub: null,
        page: '1',
      });
    }
  }

  onCatalogSearchSubmit(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.closeExploreDrawer();

    this.navigateCatalogContext({
      search: this.catalogSearchQuery.trim() || null,
      page: '1',
    });
  }

  selectExploreSubcategory(
    animal: ExploreAnimalEntry,
    category: ExploreCategoryEntry,
    subcategory: ExploreSubcategoryEntry
  ): void {
    this.closeExploreDrawer();
    this.closeMobileMenu();
    const backendCategory = String(category.legacyCategory || category.slug || '').trim().toLowerCase() || null;
    this.navigateCatalogContext({
      cat: backendCategory,
      sub: subcategory.slug || null,
      page: '1',
    }, animal.key, { resetPetTemplate: animal.key !== this.currentCatalogFamilyKey });
  }

  onCatalogMenuEnterCategory(categorySlug: string): void {
    this.setExploreCategory(categorySlug);
  }

  onCatalogCategoryPreview(categorySlug: string, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.setExploreCategory(categorySlug);
  }

  shouldAlignCatalogMenuRight(index: number): boolean {
    return index >= Math.max(3, Math.floor((this.exploreAnimals.length || 0) / 2));
  }

  private navigateCatalogContext(
    updates: Record<string, string | null>,
    familyKey: CatalogPetType | null = this.currentCatalogFamilyKey,
    options: { resetPetTemplate?: boolean } = {}
  ): void {
    const [, rawQuery = ''] = (this.router.url || '').split('?');
    const params = new URLSearchParams(rawQuery);

    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === undefined || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }

    if (options.resetPetTemplate) {
      params.delete('pet');
      params.delete('specie');
      params.delete('stage');
    }

    params.delete('petType');

    const familySlug = this.resolveCatalogFamilySlug(familyKey);
    const commands = familySlug ? ['/catalog', familySlug] : ['/catalog'];
    this.router.navigate(commands, {
      queryParams: this.urlSearchParamsToParams(params),
    });
  }

  private buildExploreAnimals(): ExploreAnimalEntry[] {
    return (this.catalogAnimals || [])
      .map((animal) => this.buildExploreAnimalEntry(animal))
      .filter((animal): animal is ExploreAnimalEntry => Boolean(animal.key));
  }

  private buildExploreFamilies(animals: ExploreAnimalEntry[]): ExploreFamilyEntry[] {
    return (animals || []).map((animal) => ({
      key: animal.key,
      label: animal.label,
      animals: [animal],
    }));
  }

  private refreshExploreAnimals(): void {
    this.exploreAnimals = this.buildExploreAnimals();
    this.exploreFamilies = this.buildExploreFamilies(this.exploreAnimals);
  }

  remove(item: CartItem): void {
    this.cart.remove(item.id);
  }

  changeCartQty(item: CartItem, delta: number): void {
    const nextQty = Math.max(1, Number(item.qty || 1) + delta);
    if (nextQty === Number(item.qty || 1)) {
      return;
    }

    this.cart.setQty(item.id, nextQty);
  }

  applyMiniCartCoupon(): void {
    this.cart.applyCoupon(this.miniCartCoupon);
  }

  private goToLogin(): void {
    this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
  }

  private goToRegister(): void {
    this.router.navigate(['/auth/register'], { queryParams: { returnUrl: this.router.url } });
  }

  private beginLogout(): void {
    if (this.isLoggingOut) return;

    this.isLoggingOut = true;
    this.logoutTimer = setTimeout(() => {
      this.auth.logout();
      this.isLoggingOut = false;
      this.userMenuOpen = false;
      this.pushSessionToast('Sesión cerrada correctamente', 'check_circle', 'success');
      this.router.navigate(['/home']);
    }, 700);
  }

  private pushSessionToast(
    message: string,
    icon: string = 'check_circle',
    type: 'success' | 'error' = 'success'
  ): void {
    this.sessionToastMessage = message;
    this.sessionToastIcon = icon;
    this.sessionToastType = type;
    this.showSessionToast = true;

    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.showSessionToast = false;
    }, this.transientMessageMs);
  }

  @HostListener('document:click', ['$event.target'])
  onClickOutside(target: EventTarget | null): void {
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (!this.eRef.nativeElement.contains(target)) {
      this.userMenuOpen = false;
      this.miniCartOpen = false;
      this.mobileMenuOpen = false;
      this.closeExploreDrawer();
    }
  }

  @HostListener('document:keydown.escape')
  onEsc() {
    this.userMenuOpen = false;
    this.miniCartOpen = false;
    this.mobileMenuOpen = false;
    this.closeExploreDrawer();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.syncViewportState();
    this.syncCatalogMenuPosition();
  }

  private loadPromoMessages(): void {
    this.storefrontApi
      .listHeaderAnnouncements()
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.allPromoAnnouncements = response.data || [];
          this.applyPromoMessages();
        },
        error: () => {
          this.allPromoAnnouncements = [];
          this.applyPromoMessages();
        },
      });
  }

  private syncPromoAudience(): void {
    if (!this.isLoggedIn) {
      this.membershipTier = 'free';
      this.applyPromoMessages();
      return;
    }

    this.storefrontApi
      .getMyMembership()
      .pipe(
        take(1),
        catchError(() => of({ data: { tier: 'free' as const } }))
      )
      .subscribe((response) => {
        this.membershipTier = response.data?.tier === 'premium' ? 'premium' : 'free';
        this.applyPromoMessages();
      });
  }

  private applyPromoMessages(): void {
    const audience = this.promoAudience;
    const announcements = this.allPromoAnnouncements || [];
    const scoped = announcements.filter((announcement) => {
      const scope = announcement?.audience || 'all';
      return scope === 'all' || scope === audience;
    });
    const fallback = announcements.filter((announcement) => (announcement?.audience || 'all') === 'all');
    const messages = (scoped.length ? scoped : fallback)
      .map((announcement) => String(announcement?.message || '').trim())
      .filter(Boolean)
      .slice(0, 6);

    this.promoMessages = messages.length ? messages : [...this.fallbackPromoMessages];
  }

  private loadCatalogNavigation(): void {
    this.storefrontApi
      .getCatalogTaxonomy()
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.catalogAnimals = response.data?.animals || [];
          this.refreshExploreAnimals();
          this.updateRouteContext(this.router.url);
          if (this.exploreDrawerOpen) {
            this.bootstrapExploreExpansion();
          }
        },
        error: () => {
          this.catalogAnimals = [];
          this.refreshExploreAnimals();
          this.updateRouteContext(this.router.url);
        },
      });
  }

  private updateRouteContext(url: string): void {
    const [rawPath, rawQuery = ''] = String(url || '').split('?');
    const normalized = rawPath.toLowerCase().split('#')[0];
    this.isCatalogRoute =
      normalized === '/catalog' ||
      (normalized.startsWith('/catalog/') && !normalized.startsWith('/catalog/product/'));

    if (!this.isCatalogRoute) {
      this.closeExploreDrawer();
      this.currentCatalogFamilyKey = null;
      this.currentCatalogCategoryKey = null;
      this.currentCatalogSubcategoryKey = null;
      this.currentCatalogTag = null;
      this.catalogSearchQuery = '';
      return;
    }

    const pathSegments = normalized.split('/').filter(Boolean);
    const routeSlug = pathSegments[1] || null;
    const params = new URLSearchParams(rawQuery);
    const queryPetType = this.normalizeCatalogPetType(params.get('petType'));

    this.currentCatalogFamilyKey = queryPetType || this.resolveCatalogPetTypeFromSlug(routeSlug);
    this.currentCatalogCategoryKey = String(params.get('cat') || '').trim().toLowerCase() || null;
    this.currentCatalogSubcategoryKey = String(params.get('sub') || '').trim().toLowerCase() || null;
    this.currentCatalogTag = this.normalizeCatalogShortcut(params.get('tag'));
    this.catalogSearchQuery = String(params.get('search') || '').trim();

    if (this.exploreDrawerOpen) {
      this.bootstrapExploreExpansion();
    }
  }

  private syncViewportState(): void {
    if (typeof window === 'undefined') {
      this.isCompactViewport = false;
      return;
    }

    const nextIsCompactViewport = window.innerWidth <= this.compactViewportBreakpoint;
    if (this.isCompactViewport && !nextIsCompactViewport) {
      this.closeExploreDrawer();
    }

    this.isCompactViewport = nextIsCompactViewport;
  }

  private resolvePetIcon(key: string): string {
    const map: Record<string, string> = {
      dog: 'pets',
      cat: 'pets',
      bird: 'flutter_dash',
      fish: 'water',
      reptile: 'cruelty_free',
      'small-pet': 'pest_control_rodent',
      horse: 'agriculture',
    };

    return map[key] || 'pets';
  }

  private resolveCategoryIcon(key: string): string {
    const map: Record<string, string> = {
      food: 'restaurant',
      treats: 'bakery_dining',
      hygiene: 'soap',
      health: 'health_and_safety',
      accesories: 'toys',
      accessories: 'toys',
      pharmacy: 'medical_services',
      supplements: 'vaccines',
    };

    const normalized = String(key || '').trim().toLowerCase();
    return map[normalized] || 'inventory_2';
  }

  private buildExploreAnimalEntry(taxonomyAnimal: StorefrontCatalogTaxonomyAnimal): ExploreAnimalEntry {
    const pet = getCatalogPetByKey({ version: '', filterLibrary: [], animals: this.catalogAnimals }, taxonomyAnimal.key || taxonomyAnimal.slug || '');
    const key = String(taxonomyAnimal.key || taxonomyAnimal.slug || taxonomyAnimal.label || '').trim().toLowerCase();
    const categories = (taxonomyAnimal?.categories || []).map((category) => this.buildExploreCategoryEntry(category));

    return {
      key,
      label: pet?.label || taxonomyAnimal?.label || key,
      icon: this.resolvePetIcon(key),
      headline: String(taxonomyAnimal?.headline || pet?.label || taxonomyAnimal?.label || key).trim(),
      subtitle: String(taxonomyAnimal?.subtitle || '').trim(),
      searchHint: String(taxonomyAnimal?.searchHint || pet?.searchHint || '').trim(),
      description: String(taxonomyAnimal?.description || '').trim(),
      image: taxonomyAnimal?.image || null,
      categories,
    };
  }

  private buildExploreCategoryEntry(category: StorefrontCatalogTaxonomyCategory): ExploreCategoryEntry {
    const slug = String(category.slug || category.key || '').trim().toLowerCase();

    return {
      slug,
      label: category.label,
      icon: this.resolveCategoryIcon(category.legacyCategory || slug),
      description: String(category.description || '').trim(),
      image: category.image || null,
      legacyCategory: String(category.legacyCategory || '').trim().toLowerCase() || null,
      subcategories: (category.subcategories || []).map((subcategory) =>
        this.buildExploreSubcategoryEntry(subcategory)
      ),
    };
  }

  private buildExploreSubcategoryEntry(
    subcategory: StorefrontCatalogTaxonomySubcategory
  ): ExploreSubcategoryEntry {
    const slug = String(subcategory.slug || subcategory.key || '').trim().toLowerCase();
    return {
      slug,
      label: subcategory.label,
    };
  }

  private normalizeCatalogPetType(value?: string | null): CatalogPetType | null {
    return getCatalogPetByKey({ version: '', filterLibrary: [], animals: this.catalogAnimals }, value)?.key || null;
  }

  private resolveExplorePromoImage(media?: StorefrontMedia | null): string {
    const rawUrl =
      media?.formats?.['medium']?.url ||
      media?.formats?.['small']?.url ||
      media?.formats?.['thumbnail']?.url ||
      media?.url ||
      '';

    return this.storefrontApi.resolveMediaUrl(rawUrl);
  }

  private resetExploreExpansion(): void {
    this.activeExploreFamilyKey = null;
    this.activeExploreAnimalKey = null;
    this.activeExploreCategorySlug = null;
    this.catalogMenuOffset = 0;
    this.catalogMenuFlip = false;
  }

  private bootstrapExploreExpansion(): void {
    const preferredAnimal = this.currentCatalogAnimal || this.exploreAnimals[0];
    if (!preferredAnimal) {
      this.resetExploreExpansion();
      return;
    }

    this.activeExploreFamilyKey = preferredAnimal.key;
    this.activeExploreAnimalKey = preferredAnimal.key;
    this.activeExploreCategorySlug = this.resolvePreferredCategorySlug(preferredAnimal.key);
    queueMicrotask(() => this.syncCatalogMenuPosition());
  }

  private getCatalogFallbackLabel(): string {
    if (this.currentCatalogTag === 'new') {
      return 'Nuevos ingresos';
    }

    if (this.currentCatalogTag === 'clearance') {
      return 'Ofertas';
    }

    return 'Catalogo general';
  }

  private resolvePreferredCategorySlug(key: CatalogPetType | null): string | null {
    const animal = this.exploreAnimals.find((entry) => entry.key === key) || null;
    if (!animal?.categories.length) {
      return null;
    }

    const currentKey = String(this.currentCatalogCategoryKey || '').trim().toLowerCase();
    const match = animal.categories.find(
      (category) => category.slug === currentKey || category.legacyCategory === currentKey
    );
    return match?.slug || animal.categories[0]?.slug || null;
  }

  private resolveCatalogFamilySlug(key: CatalogPetType | null): string | null {
    return getCatalogPetByKey({ version: '', filterLibrary: [], animals: this.catalogAnimals }, key)?.slug || null;
  }

  private resolveCatalogPetTypeFromSlug(slug?: string | null): CatalogPetType | null {
    return getCatalogPetBySlug({ version: '', filterLibrary: [], animals: this.catalogAnimals }, slug)?.key || null;
  }

  private normalizeCatalogShortcut(value?: string | null): CatalogShortcutKey | null {
    const normalized = String(value || '').trim().toLowerCase();
    return normalized === 'new' || normalized === 'clearance' ? normalized : null;
  }

  private urlSearchParamsToParams(params: URLSearchParams): Record<string, string> {
    const result: Record<string, string> = {};
    params.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  private syncCatalogMenuPosition(): void {
    if (!this.exploreDrawerOpen || this.isCompactViewport) {
      this.catalogMenuOffset = 0;
      this.catalogMenuFlip = false;
      return;
    }

    const row = this.catalogFamiliesRow?.nativeElement;
    const buttons = this.catalogFamilyButtons?.toArray().map((entry) => entry.nativeElement) || [];
    if (!row || !buttons.length || !this.activeExploreFamilyKey) {
      return;
    }

    const activeButton = buttons.find(
      (button) => String(button.dataset['familyKey'] || '').trim() === this.activeExploreFamilyKey
    );
    if (!activeButton) {
      return;
    }

    const rowRect = row.getBoundingClientRect();
    const buttonRect = activeButton.getBoundingClientRect();
    const treeWidth = Math.min(
      this.catalogTree?.nativeElement.getBoundingClientRect().width || this.catalogDropdownWidth,
      rowRect.width
    );
    const rawOffset = buttonRect.left - rowRect.left;
    const maxOffset = Math.max(0, rowRect.width - treeWidth);
    this.catalogMenuOffset = Math.max(0, Math.min(rawOffset, maxOffset));

    this.catalogMenuFlip = false;
  }
}
