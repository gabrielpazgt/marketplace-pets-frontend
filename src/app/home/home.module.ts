import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

import { SharedModule } from '../shared/shared.module';
import { HomeRoutingModule } from './home-routing.module';
import { HomeDataService } from './home.data';

import { HomeComponent } from './home/home.component';
import { HeroComponent } from './hero/hero.component';
import { CategoriesComponent } from './categories/categories.component';
import { FeaturesComponent } from './features/features.component';
import { DealsComponent } from './deals/deals.component';
import { StepsComponent } from './steps/steps.component';
import { MembershipBannerComponent } from './membership-banner/membership-banner.component';
import { NewsletterComponent } from './newsletter/newsletter.component';
import { BrandsComponent } from './brands/brands.component';


@NgModule({
  declarations: [
    HomeComponent,
    HeroComponent,
    CategoriesComponent,
    FeaturesComponent,
    DealsComponent,
    StepsComponent,
    MembershipBannerComponent,
    NewsletterComponent,
    BrandsComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatIconModule,
    SharedModule,
    HomeRoutingModule,
  ],
  providers: [HomeDataService]
})
export class HomeModule { }
