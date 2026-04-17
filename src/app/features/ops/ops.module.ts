import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OpsRoutingModule } from './ops-routing.module';
import { OpsShellComponent } from './components/ops-shell/ops-shell.component';
import { OpsDashboardComponent } from './pages/ops-dashboard/ops-dashboard.component';
import { OpsOrdersComponent } from './pages/ops-orders/ops-orders.component';
import { OpsOrderDetailComponent } from './pages/ops-order-detail/ops-order-detail.component';
import { OpsReportsComponent } from './pages/ops-reports/ops-reports.component';
import { OpsInventoryComponent } from './pages/ops-inventory/ops-inventory.component';
import { OpsFinancesComponent } from './pages/ops-finances/ops-finances.component';

@NgModule({
  declarations: [
    OpsShellComponent,
    OpsDashboardComponent,
    OpsOrdersComponent,
    OpsOrderDetailComponent,
    OpsReportsComponent,
    OpsInventoryComponent,
    OpsFinancesComponent,
  ],
  imports: [CommonModule, RouterModule, FormsModule, OpsRoutingModule],
})
export class OpsModule {}
