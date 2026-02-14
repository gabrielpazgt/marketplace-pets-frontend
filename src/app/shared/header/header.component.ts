import {
  Component,
  ElementRef,
  HostListener,
  OnInit
} from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { CartStateService } from '../../features/cart/services/cart-state.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {

  // Auth (dummy) → siempre “logueado” para ver el menú
  isLoggedIn = true;
  userMenuOpen = false;

  // Search
  showSearch = false;
  searchQuery = '';

  // Idiomas
  languages = [
    { code: 'ES', label: 'Español' },
    { code: 'EN', label: 'English' }
  ];
  selectedLanguage = 'EN';
  langOpen = false;

  // Navegación
  navLinks = [
    { label: 'INICIO',      path: '/home',    exact: true },
    { label: 'TIENDA',      path: '/catalog' },
    { label: 'MEMBRESIAS',  path: '/memberships' },
    { label: 'BLOG',        path: '/blog'  },
    { label: 'ACERCA DE',   path: '/about' },
  ];

  // Cart (en vivo)
  items$: Observable<any[]> = this.cart.items$;
  count$: Observable<number> = this.cart.itemCount$;
  total$: Observable<number> = this.cart.total$;

  // Mini cart
  miniCartOpen = false;

  // Promo (top bar)
  promoMessages: string[] = [
    '5% de descuento con membresía Premium',
    'Envío gratis en compras > Q500',
    'Nueva colección Otoño 2025',
    '2×1 en accesorios de mascotas'
  ];

  constructor(
    private eRef: ElementRef,
    private router: Router,
    private cart: CartStateService
  ) {}

  ngOnInit(): void {}

  // --- Account ---
  onUserIconClick(): void {
    this.userMenuOpen = !this.userMenuOpen; // sin redirigir a login
  }

  onUserMenuSelect(option: string): void {
    this.userMenuOpen = false;
    switch (option) {
      case 'profile':     this.router.navigate(['/account/profile']); break;
      case 'orders':      this.router.navigate(['/account/orders']); break;
      case 'pets':        this.router.navigate(['/account/pets']); break;
      case 'membership':  this.router.navigate(['/account/membership']); break;
      case 'logout':
        this.isLoggedIn = false; // TODO: conectar a AuthService
        this.router.navigate(['/']);
        break;
    }
  }

  // --- Idioma ---
  toggleLangDropdown(): void { this.langOpen = !this.langOpen; }
  selectLanguage(code: string): void {
    this.selectedLanguage = code;
    this.langOpen = false;
  }

  // --- Buscar ---
  toggleSearch(): void {
    this.showSearch = !this.showSearch;
    if (!this.showSearch) this.searchQuery = '';
  }
  onSearchSubmit(): void { console.log('Buscando:', this.searchQuery); }

  // --- Mini cart ---
  toggleMiniCart(): void { this.miniCartOpen = !this.miniCartOpen; }
  closeMiniCart(): void { this.miniCartOpen = false; }

  remove(it: any): void {}

  // Cerrar dropdowns al hacer click afuera o ESC
  @HostListener('document:click', ['$event.target'])
  onClickOutside(target: HTMLElement) {
    if (!this.eRef.nativeElement.contains(target)) {
      this.langOpen = false;
      this.userMenuOpen = false;
      this.miniCartOpen = false;
    }
  }
  @HostListener('document:keydown.escape')
  onEsc() {
    this.langOpen = false;
    this.userMenuOpen = false;
    this.miniCartOpen = false;
  }
}
