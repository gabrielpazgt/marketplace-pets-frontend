import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AccountShellComponent } from './components/account-shell/account-shell.component';
import { ProfileOverviewComponent } from './pages/profile-overview/profile-overview.component';
import { OrdersHistoryComponent } from './pages/orders-history/orders-history.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { MembershipComponent } from './pages/membership/membership.component';

const routes: Routes = [
  {
    path: '',
    component: AccountShellComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'profile' },
      { path: 'profile', component: ProfileOverviewComponent, title: 'Mi Perfil' },
      { path: 'orders', component: OrdersHistoryComponent, title: 'Historial de Compras' },

      // Pets dentro de Account
      {
        path: 'pets',
        loadChildren: () => import('../pets/pets.module').then(m => m.PetsModule),
      },

      { path: 'membership', component: MembershipComponent, title: 'Membresía' },
      { path: 'settings', component: SettingsComponent, title: 'Configuración' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AccountRoutingModule {}
