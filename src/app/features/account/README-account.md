# Account Module (Marketplace Pets)

> **Scope:** This README documents only the **Account** module we built and refined in this thread. Other modules (Auth, Catalog, Cart, Pets, etc.) are out of scope here.

---

## ✨ What’s included

- **Lazy‑loaded `account` module** with a clean **sidebar layout** and route outlets.
- **Header user menu** (UX): *Ver Perfil*, *Historial de Compras*, *Mis Mascotas*, *Membresía*, *Configuración*, *Cerrar Sesión*.
- Pages (all responsive, aligned to the global design tokens):
  - **Profile** (`/account/profile`): rich profile header, quick tabs (Mascotas, Historial, Membresía, Configuración), personal data + contact + **Addresses** block (CRUD-ready), **Preferences**, **Security**, **Membership** teaser.
  - **Orders History** (`/account/orders`): search + filters (estado, rango), status chips, expandable row with **Resumen** and **Timeline**, **Descargar factura** CTA. Mobile cards layout.
  - **Pets** (`/account/pets/**`) : reuses the existing `features/pets` module **inside account** context.
  - **Membership** (`/account/membership`): current plan card (progress to next tier), benefits, quick comparison grid, FAQ.
  - **Settings** (`/account/settings`): Profile fields, Notifications (switches), Localization (language, currency, time zone), Security (password + 2FA), **Danger zone**. *(Sessions list was removed for MVP.)*
- **Avatar placeholder** based on user sex:
  - `assets/icons/account/boy.png`
  - `assets/icons/account/girl.png`

---

## 🧩 Structure (high level)

```
src/app/features/account/
  account.module.ts
  account-routing.module.ts
  components/
    account-shell/            # Layout: sidebar + content outlet
  pages/
    profile/
    orders-history/
    membership/
    settings/
    # pets lives in features/pets and is routed inside /account
```

---

## 🚦 Routes

| Path | Component / Module | Notes |
|---|---|---|
| `/account` | `AccountShellComponent` | redirects to `/account/profile` |
| `/account/profile` | `ProfileComponent` | Main profile hub |
| `/account/orders` | `OrdersHistoryComponent` | Filters + expandable rows |
| `/account/membership` | `MembershipComponent` | Plan, progress, compare |
| `/account/settings` | `SettingsComponent` | Preferences & security |
| `/account/pets` | **lazy**: `features/pets/PetsModule` | Reused inside account |

> The standalone `/pets` top‑level route was dropped for MVP. We mount **PetsModule** under `/account/pets`.

---

## 🛠️ Module wiring

### 1) App routing (excerpt)
```ts
// src/app/app-routing.module.ts (relevant part)
{
  path: 'account',
  component: FullLayoutComponent,                 // same site layout (header/footer)
  loadChildren: () => import('./features/account/account.module')
    .then(m => m.AccountModule)
},
```

### 2) Account routing (excerpt)
```ts
const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'profile' },
  { path: 'profile', component: ProfileComponent },
  { path: 'orders', component: OrdersHistoryComponent },
  { path: 'membership', component: MembershipComponent },
  { path: 'settings', component: SettingsComponent },
  {
    path: 'pets',
    loadChildren: () => import('../../features/pets/pets.module')
      .then(m => m.PetsModule),
  },
];
```

### 3) Header menu (excerpt)
```ts
onUserMenuSelect(option: string): void {
  this.userMenuOpen = false;
  switch (option) {
    case 'profile':  this.router.navigate(['/account/profile']); break;
    case 'orders':   this.router.navigate(['/account/orders']); break;
    case 'pets':     this.router.navigate(['/account/pets']); break;
    case 'membership': this.router.navigate(['/account/membership']); break;
    case 'settings': this.router.navigate(['/account/settings']); break;
    case 'logout':   /* ... */ break;
  }
}
```
```html
<ul class="user-menu" *ngIf="isLoggedIn && userMenuOpen">
  <li (click)="onUserMenuSelect('profile')">Ver Perfil</li>
  <li (click)="onUserMenuSelect('orders')">Historial de Compras</li>
  <li (click)="onUserMenuSelect('pets')">Mis Mascotas</li>
  <li (click)="onUserMenuSelect('membership')">Membresía</li>
  <li (click)="onUserMenuSelect('settings')">Configuración</li>
  <li (click)="onUserMenuSelect('logout')">Cerrar Sesión</li>
</ul>
```

---

## 📦 Imports necesarios

Dentro de `AccountModule` asegúrate de tener:

```ts
imports: [
  CommonModule,
  FormsModule,               // ngModel in Settings, Orders filters, etc.
  ReactiveFormsModule,       // if any form grows later
  AccountRoutingModule,
  // Angular Material used in Orders History filters
  MatFormFieldModule,
  MatInputModule,
  MatSelectModule,
  MatIconModule
]
```

> Si no usas Angular Material, puedes sustituir los selects/inputs por controles nativos. En el MVP usamos Material sólo en **Orders History** para obtener menús y focus styles consistentes; el resto son controles HTML con tu sistema de diseño.

---

## 🎨 UX / UI highlights

- **Sidebar** con estado activo marcado (pill sutil). Cards con `--radius` y sombras suaves `--elev-*`.
- **Tipografía y escala**: variables `--fs-*`, espacios `--sp-*`, radios `--r-*`, colores de marca (`--brand`, `--accent`, neutrales).
- **Chips de estado** en órdenes: `pending/paid/shipped/delivered/cancelled` con fondos/bordes específicos.
- **Select panel** estilizado sólo dentro del componente Orders usando `:host ::ng-deep` para no impactar global (mínimo scoped).
- **Mobile first**: en Orders, la tabla colapsa a **cards**; en Profile y Settings los paneles se apilan.
- **Avatares por sexo**: fallback a `assets/icons/account/boy.png` o `girl.png` si el usuario no tiene imagen.

---

## 📄 Key files touched/added (Account)

- `features/account/components/account-shell/*`
- `features/account/pages/profile/*`
- `features/account/pages/orders-history/*`
  - Custom SCSS encapsulado: pill fields, styled select panel, status chips, mobile cards.
- `features/account/pages/membership/*`
  - Plan actual + progreso + grid comparativa + FAQ.
- `features/account/pages/settings/*`
  - Switches CSS, formularios de Perfil/Notificaciones/Localización, Seguridad (2FA + cambiar contraseña), Danger zone.
- `assets/icons/account/boy.png`, `assets/icons/account/girl.png`

---

## 🔍 Orders History – notes

- **Filtros**: `estado` (select) y `rango` (30/90/365 días) + **buscador** por `#orden`.
- **Descargar factura**: CTA azul (`.btn.invoice`) en cada fila (o dentro de la fila expandida).
- **Acciones simplificadas**: se retiró *Ver detalle* y *Repetir compra* del MVP (se pueden re‑instalar luego).

---

## 🔒 Settings – notes

- Switches accesibles (sin dependencias), con gradiente de marca al activar.
- Se **eliminó “Sesiones activas”** para el MVP (puede volver más adelante).
- Acciones simuladas (alerts / timeouts) a la espera de conectar servicios.

---

## 🐾 Pets dentro de Account

Reutilizamos **`features/pets`** tal cual, montándolo en `/account/pets`. Los perfiles de mascotas siguen guardándose en `localStorage` a través de `PetsStateService`. Esto permitirá, a futuro, **usar la data de mascotas como plantilla** para filtrar productos en el catálogo.

---

## 🧪 Datos mock y assets

- Perfil: información dummy (nombre, email) y foto por sexo (boy/girl).
- Membresia: valores simulados pendientes de conectar a backend real.
- Orders: lista de órdenes dummy con estados para demostrar UI.

> Conectar a backend sólo requerirá mapear los modelos a estos mismos slots visuales.

---

## 🗺️ Próximos pasos sugeridos

- Conectar Orders a API (paginación y descarga de factura).
- Persistir Settings/Perfil en backend (y validaciones).
- Habilitar **detalle de orden** como página interna (`/account/orders/:id`).
- Integrar estado de **membresia gratuita** en Profile/Membership con datos reales de backend.
- Modal de **cambio de contraseña** y **2FA** con OTP.
- “Mis Direcciones” en Profile con CRUD completo y selección en Checkout.

---

## ✅ Checklist de verificación rápida

- [ ] Navega a `/account/profile` y comprueba los bloques y avatar.
- [ ] `/account/orders` muestra filtros y chips, y la **descarga de factura** (mock).
- [ ] `/account/pets` carga el módulo existente dentro de Account.
- [ ] `/account/membership` muestra plan, progreso y comparativa.
- [ ] `/account/settings` guarda cambios (mock) y alterna switches.
- [ ] Menú de usuario en header abre/dirige correctamente a cada sección.

---

## Créditos de diseño

Se siguen los **tokens globales** definidos en `styles.scss` (`--brand`, `--ink`, `--line`, `--r-*`, `--elev-*`, `--fs-*`, `--sp-*`, etc.) para mantener una **línea gráfica coherente** con todo el marketplace.
