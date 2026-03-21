import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { filter, take, takeUntil } from 'rxjs/operators';
import { AuthService, AuthUser } from '../../auth/services/auth.service';
import {
  StorefrontCatalogTaxonomyAnimal,
  StorefrontCatalogTaxonomyCategory,
  StorefrontCatalogTaxonomySubcategory,
  StorefrontMedia
} from '../../core/models/storefront.models';
import { StorefrontApiService } from '../../core/services/storefront-api.service';
import { CATALOG_PETS, CatalogPetType } from '../../features/catalog/catalog-navigation.config';
import { CartItem } from '../../features/cart/models/cart.model';
import { CartStateService } from '../../features/cart/services/cart-state.service';

type CatalogShortcutKey = 'clearance' | 'new';

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
  description: string;
  image?: StorefrontMedia | null;
  categories: ExploreCategoryEntry[];
}

interface ExplorePromoCard {
  imageUrl: string;
  imageAlt: string;
}

@Component({
  standalone: false,
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  private readonly transientMessageMs = 3000;
  private readonly compactViewportBreakpoint = 980;

  isLoggedIn = false;
  currentUser: AuthUser | null = null;
  userMenuOpen = false;
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
  activeExploreAnimalKey: CatalogPetType | null = null;
  activeExploreCategorySlug: string | null = null;
  catalogAnimals: StorefrontCatalogTaxonomyAnimal[] = [];
  exploreAnimals: ExploreAnimalEntry[] = [];

  navLinks = [
    { label: 'INICIO', path: '/home', exact: true },
    { label: 'TIENDA', path: '/catalog' },
    { label: 'MEMBRESÍA', path: '/memberships' },
    { label: 'ACERCA DE', path: '/about' },
  ];

  items$: Observable<CartItem[]> = this.cart.items$;
  count$: Observable<number> = this.cart.itemCount$;
  subtotal$: Observable<number> = this.cart.subtotal$;
  total$: Observable<number> = this.cart.total$;

  miniCartOpen = false;

  promoMessages: string[] = [];
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

    this.loadPromoMessages();
    this.refreshExploreAnimals();
    this.loadCatalogNavigation();
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

    this.activeExploreAnimalKey = key;
    const firstCategory = this.activeExploreCategories[0];
    this.activeExploreCategorySlug = firstCategory?.slug || null;
  }

  isExploreAnimalActive(key: CatalogPetType): boolean {
    return this.activeExploreAnimalKey === key;
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

    if (kind === 'new') {
      this.router.navigate(['/catalog'], {
        queryParams: { tag: 'new', sort: 'new', stock: 'in', page: 1 },
      });
      return;
    }

    this.router.navigate(['/catalog'], {
      queryParams: {
        tag: 'clearance',
        sort: 'popular',
        stock: 'in',
        page: 1,
      },
    });
  }

  selectExploreCategory(animal: ExploreAnimalEntry, category: ExploreCategoryEntry): void {
    this.closeExploreDrawer();
    this.closeMobileMenu();
    const backendCategory = String(category.legacyCategory || category.slug || '').trim().toLowerCase() || null;
    this.router.navigate(['/catalog'], {
      queryParams: {
        petType: animal.key,
        cat: backendCategory,
        sub: null,
        page: 1,
      },
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
    this.router.navigate(['/catalog'], {
      queryParams: {
        petType: animal.key,
        cat: backendCategory,
        sub: subcategory.slug || null,
        page: 1,
      },
    });
  }

  private buildExploreAnimals(): ExploreAnimalEntry[] {
    const preferredOrder: CatalogPetType[] = ['dog', 'cat', 'horse', 'bird', 'fish', 'reptile', 'small-pet'];
    const taxonomyByKey = new Map<CatalogPetType, StorefrontCatalogTaxonomyAnimal>();

    for (const animal of this.catalogAnimals) {
      const key = this.normalizeCatalogPetType(animal.key || animal.slug || '');
      if (key) {
        taxonomyByKey.set(key, animal);
      }
    }

    return preferredOrder.map((key) => this.buildExploreAnimalEntry(key, taxonomyByKey.get(key)));
  }

  private refreshExploreAnimals(): void {
    this.exploreAnimals = this.buildExploreAnimals();
  }

  remove(item: CartItem): void {
    this.cart.remove(item.id);
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
  }

  private loadPromoMessages(): void {
    this.storefrontApi
      .listHeaderAnnouncements()
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          const messages = (response.data || [])
            .map((announcement) => (announcement.message || '').trim())
            .filter(Boolean)
            .slice(0, 6);

          this.promoMessages = messages;
        },
        error: () => {
          this.promoMessages = [];
        },
      });
  }

  private loadCatalogNavigation(): void {
    this.storefrontApi
      .getCatalogTaxonomy()
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.catalogAnimals = response.data?.animals || [];
          this.refreshExploreAnimals();
          if (this.exploreDrawerOpen) {
            this.bootstrapExploreExpansion();
          }
        },
        error: () => {
          this.catalogAnimals = [];
          this.refreshExploreAnimals();
        },
      });
  }

  private updateRouteContext(url: string): void {
    const normalized = String(url || '').toLowerCase().split('?')[0].split('#')[0];
    this.isCatalogRoute =
      normalized === '/catalog' ||
      (normalized.startsWith('/catalog/') && !normalized.startsWith('/catalog/product/'));

    if (!this.isCatalogRoute) {
      this.closeExploreDrawer();
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

  private buildExploreAnimalEntry(
    key: CatalogPetType,
    taxonomyAnimal?: StorefrontCatalogTaxonomyAnimal
  ): ExploreAnimalEntry {
    const staticPet = CATALOG_PETS.find((pet) => pet.key === key);
    const categories = (taxonomyAnimal?.categories || []).map((category) => this.buildExploreCategoryEntry(category));

    return {
      key,
      label: staticPet?.label || taxonomyAnimal?.label || key,
      icon: this.resolvePetIcon(key),
      headline: String(taxonomyAnimal?.headline || taxonomyAnimal?.label || staticPet?.label || key).trim(),
      subtitle: String(taxonomyAnimal?.subtitle || '').trim(),
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
    const normalized = String(value || '').trim().toLowerCase();
    return CATALOG_PETS.find((pet) => pet.key === normalized)?.key || null;
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
    this.activeExploreAnimalKey = null;
    this.activeExploreCategorySlug = null;
  }

  private bootstrapExploreExpansion(): void {
    const firstAnimal = this.exploreAnimals[0];
    if (!firstAnimal) {
      this.resetExploreExpansion();
      return;
    }

    this.activeExploreAnimalKey = firstAnimal.key;
    this.activeExploreCategorySlug = firstAnimal.categories[0]?.slug || null;
  }
}

