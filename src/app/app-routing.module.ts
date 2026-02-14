import { NgModule }             from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthLayoutComponent }  from './layouts/layouts/auth-layout/auth-layout.component';
import { FullLayoutComponent }  from './layouts/layouts/full-layout/full-layout.component';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },

  {
    path: 'auth',
    component: AuthLayoutComponent,
    loadChildren: () => import('./auth/auth.module').then(m => m.AuthModule)
  },
  {
    path: 'home',
    component: FullLayoutComponent,
    loadChildren: () => import('./home/home.module').then(m => m.HomeModule)
  },
  {
    path: 'catalog',
    component: FullLayoutComponent,
    loadChildren: () => import('./features/catalog/catalog.module').then(m => m.CatalogModule)
  },
  {
    path: 'cart',
    component: FullLayoutComponent,
    loadChildren: () => import('./features/cart/cart.module').then(m => m.CartModule)
  },
  {
    path: 'checkout',
    loadChildren: () => import('./features/checkout/checkout.module').then(m => m.CheckoutModule)
  },

  /* Área del usuario (sin AuthGuard por ahora) */
  {
    path: 'account',
    component: FullLayoutComponent,
    loadChildren: () => import('./features/account/account.module').then(m => m.AccountModule),
  },

  {
  path: 'memberships',
  component: FullLayoutComponent,
  loadChildren: () => import('./features/memberships/memberships.module')
    .then(m => m.MembershipsModule)
  },


  { path: '**', redirectTo: 'home' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'enabled' })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
