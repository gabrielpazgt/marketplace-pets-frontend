import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CatalogRoutingModule } from './catalog-routing.module';
import { CatalogComponent } from './catalog.component';
import { ShopPageComponent } from './pages/shop-page/shop-page.component';
import { ProductCardComponent } from './components/product-card/product-card.component';
import { SortBarComponent } from './components/sort-bar/sort-bar.component';
import { FiltersDrawerComponent } from './components/filters-drawer/filters-drawer.component';
import { ReactiveFormsModule } from '@angular/forms';
import { PaginationComponent } from './components/pagination/pagination.component';


@NgModule({
  declarations: [
    CatalogComponent,
    ShopPageComponent,
    ProductCardComponent,
    SortBarComponent,
    FiltersDrawerComponent,
    PaginationComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CatalogRoutingModule
  ]
})
export class CatalogModule { }
