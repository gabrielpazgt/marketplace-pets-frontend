import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HomeRoutingModule } from './home-routing.module';
import { HeroComponent } from './hero/hero.component';
import { CategoriesComponent } from './categories/categories.component';
import { FeaturesComponent } from './features/features.component';
import { DealsComponent } from './deals/deals.component';
import { HomeComponent } from './home/home.component';
import { RouterModule } from '@angular/router';
import { HomeDataService } from './home.data';


@NgModule({
  declarations: [
    HeroComponent,
    CategoriesComponent,
    FeaturesComponent,
    DealsComponent,
    HomeComponent
  ],
  imports: [
    CommonModule,
    HomeRoutingModule,
    RouterModule,
  ],
  providers: [HomeDataService]
})
export class HomeModule { }
