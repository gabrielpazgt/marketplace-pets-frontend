import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProductDetailComponent } from './pages/product-detail/product-detail.component';
import { ShopPageComponent } from './pages/shop-page/shop-page.component';

const routes: Routes = [
  { path: '', component: ShopPageComponent },
  { path: 'product/:slug', component: ProductDetailComponent },
  { path: ':slug', component: ShopPageComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CatalogRoutingModule {}
