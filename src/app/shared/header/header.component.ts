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
  // Auth (dummy): siempre logueado para ver el menu
  isLoggedIn = true;
  userMenuOpen = false;

  // Search
  showSearch = false;
  searchQuery = '';
  mobileMenuOpen = false;

  // Navegacion
  navLinks = [
    { label: 'INICIO', path: '/home', exact: true },
    { label: 'TIENDA', path: '/catalog' },
    { label: 'MEMBRESIAS', path: '/memberships' },
    { label: 'BLOG', path: '/blog' },
    { label: 'ACERCA DE', path: '/about' },
  ];

  // Cart (en vivo)
  items$: Observable<any[]> = this.cart.items$;
  count$: Observable<number> = this.cart.itemCount$;
  total$: Observable<number> = this.cart.total$;

  // Mini cart
  miniCartOpen = false;

  // Promo (top bar)
  promoMessages: string[] = [
    '5% de descuento con membresia Premium',
    'Envio gratis en compras > Q500',
    'Nueva coleccion Otono 2025',
    '2x1 en accesorios de mascotas'
  ];

  constructor(
    private eRef: ElementRef,
    private router: Router,
    private cart: CartStateService
  ) {}

  ngOnInit(): void {}

  // --- Account ---
  onUserIconClick(): void {
    this.userMenuOpen = !this.userMenuOpen;
  }

  onUserMenuSelect(option: string): void {
    this.userMenuOpen = false;
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
      case 'logout':
        this.isLoggedIn = false;
        this.router.navigate(['/']);
        break;
    }
  }

  // --- Buscar ---
  toggleSearch(): void {
    this.showSearch = !this.showSearch;
    if (!this.showSearch) this.searchQuery = '';
  }

  onSearchSubmit(): void {
    console.log('Buscando:', this.searchQuery);
  }

  // --- Mobile nav ---
  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  // --- Mini cart ---
  toggleMiniCart(): void {
    this.miniCartOpen = !this.miniCartOpen;
  }

  closeMiniCart(): void {
    this.miniCartOpen = false;
  }

  remove(_it: any): void {}

  // Cerrar dropdowns al hacer click afuera o ESC
  @HostListener('document:click', ['$event.target'])
  onClickOutside(target: HTMLElement) {
    if (!this.eRef.nativeElement.contains(target)) {
      this.userMenuOpen = false;
      this.miniCartOpen = false;
      this.mobileMenuOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEsc() {
    this.userMenuOpen = false;
    this.miniCartOpen = false;
    this.mobileMenuOpen = false;
  }
}
