# Marketplace Frontend Context

## Resumen

Este proyecto es la SPA Angular del ecommerce. Prioriza UX en espanol, responsive real y una UI consistente con design tokens globales. Consume el backend de `strapi-backend` a traves de `StorefrontApiService`.

## Stack real

- Angular `21.x`
- TypeScript + SCSS
- Angular Material parcial
- Arquitectura por NgModules, no por standalone components
- Routing lazy por feature

## Comandos utiles

- `npm install`
- `npm run start`
- `npm run build`
- `npm run test`

Desarrollo local normal:

- app en `http://localhost:4200`
- backend esperado en `http://localhost:1338`

## Puntos de entrada importantes

- `src/app/app-routing.module.ts`: routing principal
- `src/app/core/services/storefront-api.service.ts`: contrato HTTP con el backend
- `src/app/core/models/storefront.models.ts`: tipos compartidos con la API
- `src/styles.scss`: design tokens y utilidades globales
- `src/theme.scss`: tema complementario
- `src/environments/environment*.ts`: API base URL

## Modulos y zonas funcionales

- `src/app/home/`: home principal
- `src/app/features/catalog/`: listado, filtros, detalle de producto
- `src/app/features/cart/`: carrito
- `src/app/features/checkout/`: checkout multistep
- `src/app/features/account/`: perfil, ordenes, membresia, settings
- `src/app/features/pets/`: mascotas del usuario
- `src/app/features/memberships/`: planes de membresia
- `src/app/shared/` y `src/app/layouts/`: shell visual reutilizable

## Rutas relevantes

- `/home`
- `/catalog`
- `/catalog/:slug`
- `/catalog/product/:slug`
- `/cart`
- `/checkout/contact`
- `/checkout/shipping`
- `/checkout/payment`
- `/checkout/review`
- `/checkout/success`
- `/account/profile`
- `/account/orders`
- `/account/pets`
- `/account/membership`
- `/account/settings`
- `/memberships/plans`

## Reglas funcionales que conviene recordar

- Todo texto visible al usuario debe quedar en espanol natural.
- Mantener responsive en desktop, tablet y mobile.
- La UI ya se apoya mucho en tokens globales; evita meter colores y espaciados hardcodeados si ya existe un token.
- El frontend consume el backend custom de storefront, no solo endpoints REST genericos de Strapi.
- El guest cart usa `X-Cart-Session` en el flujo API.
- Las vistas de cuenta, mascotas, carrito, catalogo y checkout comparten modelos del dominio storefront.

## Integracion con backend

El servicio principal es `src/app/core/services/storefront-api.service.ts`. Desde ahi salen, entre otros, estos grupos de endpoints:

- productos y facets
- taxonomy de mascotas y catalogo
- carrito guest y usuario
- checkout guest y usuario
- perfil, preferencias, membresia
- direcciones, mascotas y ordenes

Si cambias payloads o nombres de campos en Strapi, casi seguro debes tocar:

- `src/app/core/models/storefront.models.ts`
- `src/app/core/services/storefront-api.service.ts`
- el feature que consume ese endpoint

## Convenciones utiles

- El proyecto usa modulos lazy existentes; si agregas una feature nueva, sigue ese patron.
- Las plantillas y estilos suelen estar muy trabajados a mano; conserva el lenguaje visual ya establecido.
- Para copy o labels, respeta `PROJECT_GUIDELINES.md` del workspace.
- Si una logica de template se pone compleja, moverla al `.ts` suele ser la mejor salida.

## Advertencias practicas

- `angular.json` tiene `standalone: false` en los schematics; no mezclar patrones sin necesidad.
- `src/environments/environment.production.ts` hoy sigue apuntando a localhost; revisar esto antes de un build realmente productivo.
- Hay trabajo local en progreso con cambios sin commit. Antes de editar, revisar `git status`.

## Definition of done util

Para cambios normales de frontend, intenta cerrar con:

- build verde con `npm run build`
- sin errores de template ni imports rotos
- copy en espanol correcto
- responsive validado en la vista tocada
- si hubo cambio de API, payloads alineados con `strapi-backend`
