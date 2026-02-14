import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { CartRoutingModule } from './cart-routing.module';
import { CartPageComponent } from './pages/cart-page/cart-page.component';
import { QuantityStepperComponent } from './components/quantity-stepper/quantity-stepper.component';
import { CartItemComponent } from './components/cart-item/cart-item.component';
import { OrderSummaryComponent } from './components/order-summary/order-summary.component';
import { FreeShippingComponent } from './components/free-shipping/free-shipping.component';
import { CartEmptyComponent } from './components/cart-empty/cart-empty.component';
import { CartRecommendationsComponent } from './components/cart-recommendations/cart-recommendations.component';

@NgModule({
  declarations: [
    CartPageComponent,
    QuantityStepperComponent,
    CartItemComponent,
    OrderSummaryComponent,
    FreeShippingComponent,
    CartEmptyComponent,
    CartRecommendationsComponent
  ],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, CartRoutingModule]
})
export class CartModule {}
