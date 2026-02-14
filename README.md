### Password: vKPD6Rx9!

# MARKETPETS — Frontend (Angular)

Proyecto **SPA en Angular** para un e‑commerce de mascotas con **checkout multistep**, **carrito persistente**, **sistema de precios con membresía** y una **UI unificada** basada en *design tokens* definidos en `styles.scss`.

> Este README resume arquitectura, decisiones de diseño, estructura de carpetas, estilos compartidos y cómo ejecutar/desarrollar todo lo que construimos.

---

## 🚀 Stack

- **Angular** 17+ (CLI)
- **TypeScript** con tipado estricto
- **RxJS** para estado reactivo (cart & checkout)
- **Angular Material (parcial)**: íconos (`<mat-icon>`)
- **SCSS** con *Design Tokens* + utilidades globales
- **CSS variables** y *clamp()* para tipografía fluida

> Requisitos sugeridos: Node 18+, PNPM/NPM reciente, Angular CLI 17+.

---

## ▶️ Arranque rápido

```bash
# instalar dependencias
npm install

# desarrollo
npm run start      # => ng serve (http://localhost:4200)

# build de producción
npm run build
```

---

## 🧭 Estructura (resumen)

```
src/
 └─ app/
    ├─ core/                         # (opcional) servicios/guards globales
    ├─ services/
    │   └─ cart-state.service.ts     # Estado reactivo del carrito
    ├─ features/
    │   ├─ home/
    │   │   ├─ components/
    │   │   │   ├─ hero/
    │   │   │   ├─ categories/
    │   │   │   ├─ deals/
    │   │   │   └─ features/         # (beneficios) + carrusel ligero
    │   │   └─ home.models.ts
    │   ├─ catalog/
    │   │   └─ components/filters-drawer/
    │   ├─ cart/
    │   │   └─ components/cart-item/
    │   └─ checkout/
    │       ├─ pages/
    │       │   ├─ checkout-shipping/
    │       │   ├─ checkout-payment/
    │       │   └─ checkout-review/
    │       ├─ components/order-summary/
    │       ├─ services/checkout-state.service.ts
    │       ├─ services/checkout.guard.ts
    │       └─ checkout-routing.module.ts
    ├─ shared/                       # pipes/comp utilitarios (si aplica)
    └─ app.component.*
assets/
 ├─ images/, icons/, illustrations/ ...
 └─ logos/
styles.scss                          # Design System tokens + utilidades
theme.scss (o theme)                 # Angular Material theme
```

> ⚠️ **Rutas de import**: `CartStateService` debe importarse desde su ubicación real. Ajusta paths si lo moviste a `app/features/...` para evitar `Cannot find module`.

---

## 🛒 Estado del Carrito (`CartStateService`)

Servicio reactivo (mock inicial) que expone:

- `items$`: lista de `CartItem`
- `itemCount$`: cantidad total
- `subtotal$`: suma de líneas
- `discountRate$`: **cupón mock** `AUMAKKI15 => 15%`
- `discount$`: subtotal × rate
- `shipping$`: **Q0** desde **Q500**, si no **Q25**
- `total$`: (subtotal − descuento) + envío
- Acciones: `applyCoupon(code)`, `setQty(id, qty)`, `remove(id)`, `clear()`

**Modelo base** (`CartItem`):

```ts
export type CartItem = {
  id: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  oldPrice?: number;
  qty: number;
  stock: number;
  attrs?: string[];
  memberPrice?: number; // opcional; si no viene se usa rate por defecto (10%)
};
```

> **Membresía**: si `memberPrice` existe, se usa; si no, `price * (1 - membershipRate)` (10% default).

---

## 💳 Precios con Membresía (destacados + carrito + resumen)

### Destacados (`features/home/components/deals`)
- Muestra **precio normal** y **precio membresía** lado a lado.
- Si existen `oldPrice` u “oferta”, se presenta tachado para **ambos**.
- Fallback cuando no hay `memberPrice`: `membershipRate = 0.10` (configurable).

### Carrito (`features/cart/components/cart-item`)
- Bajo **Precio** se ven dos chips:
  - **Normal**: `oldPrice` (si hay) + precio actual.
  - **Membresía**: `oldMember` (si hay) + precio miembro (o 10% menos).
- El **Total** de línea permanece con precio **normal** para no romper el flujo actual.

### Order Summary (`features/checkout/components/order-summary`)
- **Subtotal / Descuento / Envío / Total** → **normales**.
- Fila adicional **“Total membresía”** (cálculo paralelo).
- Texto **“Ahorras QXXX con tu membresía”** con **QXXX en negrita**.

---

## 🧾 Checkout (módulo lazy)

Flujo:
1. **Envío**: selección de método (`shippingMethods` mock)
2. **Pago**: formulario tipado (tarjeta/transferencia/contraentrega)
3. **Revisión**: resumen + confirmación

Infra:
- `CheckoutStateService` centraliza snapshot del checkout y deriva totales consistentes con el carrito.
- `CheckoutGuard` bloquea `/checkout` si no hay items.
- El botón **“Pagar ahora”** del **mini-cart** y del **OrderSummary** navega a `/checkout` solo si hay productos.

---

## 🎨 Design System (`styles.scss`)

Tokens en `:root` reutilizados por toda la UI:

- **Colores**: `--brand`, `--brand-600`, `--brand-700`, `--accent`, `--success`, `--danger`, `--muted`, `--line`, `--chip`, `--surface-50`, etc.
- **Tipografía fluida**: `--fs-*`, line-heights
- **Espaciados** `--sp-*`
- **Radius**: `--r-xs` … `--r-pill`
- **Sombras**: `--elev-*`, `--shadow-card`
- **Transiciones**: `--t-fast`, `--t-base`

**Utilidades**: `.container`, `.muted`, `.sr-only`, `.badge`, `.chip`, `.input`, `.table`.  
**Botones DS**: `.btn` + variantes `.primary`, `.ghost`, `.accent`, `.success`, `.danger` (usados en hero, deals, mini-cart, newsletter, etc.).

---

## 🏠 Home (secciones principales)

- **Hero**: CTAs `.btn`, “promo chip”, features (icon+texto), tags, media con “blob” animado.
- **Categorías**: cards con hover lift y **flecha naranja** al pasar (estándar con el resto de CTAs).
- **Destacados**: rejilla + botón “**Ver todo**” con flecha redonda animada.
- **Features (beneficios)**: tarjetas alineadas al DS y **carrusel auto-rotate** (4s) que no rompe layout.
- **Header**: *top bar* con **gradiente naranja** (como el footer), marquee de promos, buscador expandible, menú de usuario, y **mini-carrito** accesible.
- **Footer**: ola superior integrada, newsletter con botón `.btn.primary`, **Contact** alineado (sin “tab” a la derecha), redes en chips circulares.

---

## 🧰 Catálogo — Drawer de Filtros

- Chips toggles (checkbox oculto, `label` clickeable).
- Rango de precio (mín/máx).
- Footer sticky con acciones *Limpiar* / *Aplicar*.
- **Fix Angular**: si necesitas `aria-label` en inputs, úsalo en el `label` o como `[attr.aria-label]` para evitar `NG8002`.

---

## 🧪 Errores típicos y soluciones aplicadas

- **`form.get(...)` en templates** devuelve `AbstractControl|null`: en HTML usamos cast seguro:  
  ` [formGroup]="form.get('card') as FormGroup"`, ` [formControl]="form.get('kind') as FormControl"`
- **Parser Error** por expresiones complejas en plantillas (`find(...)`/asignaciones): mover lógica al TS/getter.
- **Imports rotos** (`Cannot find module .../cart-state.service`) → corregir rutas absolutas/relativas.
- **Alineación Contacto (footer)**: grid consistente columna icono + texto.

---

## 🔒 Accesibilidad

- `:focus-visible` (ring naranja)
- `prefers-reduced-motion`
- `sr-only` para textos ocultos
- Botones grandes y legibles
- Skeletons para cargas (`deals`, `categories`).

---

## 🔁 Rutas clave

- `/` → Home
- `/cart` → Carrito (con `OrderSummary` a la derecha en desktop)
- `/checkout` (guard) → Shipping → Payment → Review

---

## 🔧 Constantes útiles

- Cupón mock: **`AUMAKKI15` = 15%**
- Envío gratis: **Q500+**; si no, **Q25**
- Rate membresía (fallback): **10%** (`membershipRate = 0.10`)

Para usar precio de miembro específico por producto:

```ts
{ id: '1', name: 'Croquetas', price: 499, memberPrice: 449, oldPrice: 560, ... }
```

---

## 🗺️ Backlog

- Integración real de API (productos, carritos, órdenes)
- Autenticación y perfil (estado de membresía real)
- Pasarela de pago
- i18n completo
- Tests unitarios/E2E

---

## 📄 Créditos & Licencia

© MarketPets — UI y componentes creados para este proyecto demo. Uso interno del equipo/proyecto.

---

### Mini guía “¿Dónde cambio…?”

- **Tokens/colores globales** → `styles.scss`
- **Botones (CTA)** → `.btn` en `styles.scss`
- **Header (gradiente top-bar)** → `app-header` styles
- **Footer (ola/newsletter)** → `footer.component.scss`
- **Destacados (doble precio)** → `features/home/components/deals/*`
- **Carrito (chips Normal/Membresía)** → `features/cart/components/cart-item/*`
- **Order Summary (Total membresía + ahorro)** → `features/checkout/components/order-summary/*`
- **Filtros catálogo** → `features/catalog/components/filters-drawer/*`
- **Cupón/envío** → `CartStateService`
