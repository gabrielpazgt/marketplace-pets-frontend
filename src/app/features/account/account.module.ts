import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountRoutingModule } from './account-routing.module';

import { AccountShellComponent } from './components/account-shell/account-shell.component';
import { ProfileOverviewComponent } from './pages/profile-overview/profile-overview.component';
import { OrdersHistoryComponent } from './pages/orders-history/orders-history.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { MembershipComponent } from './pages/membership/membership.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PetsModule } from '../pets/pets.module';

import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatOptionModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

@NgModule({
  declarations: [
    AccountShellComponent,
    ProfileOverviewComponent,
    OrdersHistoryComponent,
    SettingsComponent,
    MembershipComponent
  ],
  imports: [
    CommonModule,
    AccountRoutingModule,
    ReactiveFormsModule,
    PetsModule,
    FormsModule,

    MatSelectModule,
    MatFormFieldModule,
    MatOptionModule,
    MatInputModule,
    MatIconModule,
    
  ]
})
export class AccountModule {}
