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
import { ProductDetailComponent } from './pages/product-detail/product-detail.component';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSliderModule } from '@angular/material/slider';


@NgModule({
  declarations: [
    CatalogComponent,
    ShopPageComponent,
    ProductCardComponent,
    SortBarComponent,
    FiltersDrawerComponent,
    PaginationComponent,
    ProductDetailComponent
  ],
  imports: [
    CommonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatCheckboxModule,
    MatSliderModule,
    ReactiveFormsModule,
    CatalogRoutingModule
  ]
})
export class CatalogModule { }
