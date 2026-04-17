import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OpsShellComponent } from './components/ops-shell/ops-shell.component';
import { OpsDashboardComponent } from './pages/ops-dashboard/ops-dashboard.component';
import { OpsOrdersComponent } from './pages/ops-orders/ops-orders.component';
import { OpsOrderDetailComponent } from './pages/ops-order-detail/ops-order-detail.component';
import { OpsReportsComponent } from './pages/ops-reports/ops-reports.component';
import { OpsInventoryComponent } from './pages/ops-inventory/ops-inventory.component';
import { OpsFinancesComponent } from './pages/ops-finances/ops-finances.component';

const routes: Routes = [
  {
    path: '',
    component: OpsShellComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: OpsDashboardComponent },
      { path: 'orders', component: OpsOrdersComponent },
      { path: 'orders/:id', component: OpsOrderDetailComponent },
      { path: 'reports', component: OpsReportsComponent },
      { path: 'inventory', component: OpsInventoryComponent },
      { path: 'finances', component: OpsFinancesComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class OpsRoutingModule {}
