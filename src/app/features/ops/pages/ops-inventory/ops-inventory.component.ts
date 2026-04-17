import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { StorefrontApiService } from '../../../../core/services/storefront-api.service';
import { OpsInventory, OpsInventoryItem, OpsInventoryVariant } from '../../../../core/models/storefront.models';

type StockFilter = 'all' | 'out' | 'low' | 'ok' | 'untracked';

@Component({
  standalone: false,
  selector: 'mp-ops-inventory',
  templateUrl: './ops-inventory.component.html',
  styleUrls: ['./ops-inventory.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpsInventoryComponent implements OnInit {
  private api = inject(StorefrontApiService);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('csvInput') csvInputRef!: ElementRef<HTMLInputElement>;

  inventory: OpsInventory | null = null;
  loading = true;
  error = '';
  search = '';
  stockFilter: StockFilter = 'all';

  // CSV bulk update state
  csvUploading = false;
  csvResult: { updated: number; notFound: string[]; errors: string[] } | null = null;
  csvError = '';

  ngOnInit(): void {
    this.api.getOpsInventory().subscribe({
      next: (res) => { this.inventory = res.data; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.error = 'No se pudo cargar el inventario.'; this.loading = false; this.cdr.markForCheck(); },
    });
  }

  get filteredProducts(): OpsInventoryItem[] {
    if (!this.inventory) return [];
    const q = this.search.trim().toLowerCase();
    return this.inventory.products.filter(p => {
      const matchesSearch = !q
        || p.name.toLowerCase().includes(q)
        || (p.sku || '').toLowerCase().includes(q)
        || (p.brand?.name || '').toLowerCase().includes(q)
        || p.variants.some(v => (v.sku || '').toLowerCase().includes(q) || v.label.toLowerCase().includes(q));
      return matchesSearch && this.matchesStockFilter(p);
    });
  }

  private matchesStockFilter(p: OpsInventoryItem): boolean {
    if (this.stockFilter === 'all') return true;
    if (p.hasVariants) {
      // For variant products, match if any variant matches the filter
      if (this.stockFilter === 'out') return p.variants.some(v => v.stock === 0);
      if (this.stockFilter === 'low') return p.variants.some(v => v.stock > 0 && v.stock <= 5);
      if (this.stockFilter === 'ok') return p.variants.some(v => v.stock > 5);
      if (this.stockFilter === 'untracked') return false;
      return true;
    }
    if (this.stockFilter === 'out') return p.stock === 0;
    if (this.stockFilter === 'low') return p.stock !== null && p.stock > 0 && p.stock <= 5;
    if (this.stockFilter === 'ok') return p.stock !== null && p.stock > 5;
    if (this.stockFilter === 'untracked') return p.stock === null;
    return true;
  }

  stockClass(p: OpsInventoryItem): string {
    if (p.stock === null) return 'stock--untracked';
    if (p.stock === 0) return 'stock--out';
    if (p.stock <= 5) return 'stock--low';
    return 'stock--ok';
  }

  variantStockClass(v: OpsInventoryVariant): string {
    if (v.stock === 0) return 'stock--out';
    if (v.stock <= 5) return 'stock--low';
    return 'stock--ok';
  }

  totalVariantStock(p: OpsInventoryItem): number {
    return p.variants.reduce((sum, v) => sum + v.stock, 0);
  }

  stockLabel(p: OpsInventoryItem): string {
    if (p.stock === null) return 'Sin tracking';
    if (p.stock === 0) return 'Sin stock';
    return String(p.stock);
  }

  exportCSV(): void {
    const rows = [
      ['Producto', 'SKU', 'Marca', 'Precio (Q)', 'Stock', 'Estado'],
      ...(this.inventory?.products || []).map(p => [
        p.name, p.sku || '', p.brand?.name || '', p.price,
        p.stock === null ? 'Sin tracking' : p.stock,
        p.stock === 0 ? 'Sin stock' : p.stock !== null && p.stock <= 5 ? 'Stock bajo' : 'OK',
      ]),
    ];
    this.downloadCsv(rows, 'inventario.csv');
  }

  /** Download a CSV template for bulk stock update */
  downloadStockTemplate(): void {
    const rows = [
      ['sku', 'cantidad'],
      ...(this.inventory?.products || [])
        .filter(p => p.sku)
        .map(p => [p.sku || '', p.stock ?? '']),
    ];
    this.downloadCsv(rows, 'actualizar-stock-template.csv');
  }

  /** Triggered when user picks a file */
  onCsvFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.csvResult = null;
    this.csvError = '';
    this.cdr.markForCheck();

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || '';
      const updates = this.parseCsvUpdates(text);
      if (updates === null) {
        this.csvError = 'El archivo CSV no tiene el formato correcto. Necesita dos columnas: SKU y cantidad.';
        this.cdr.markForCheck();
        return;
      }
      if (updates.length === 0) {
        this.csvError = 'El CSV está vacío o no tiene filas válidas.';
        this.cdr.markForCheck();
        return;
      }
      this.uploadUpdates(updates);
    };
    reader.readAsText(file, 'utf-8');
    // Reset input so the same file can be selected again
    (event.target as HTMLInputElement).value = '';
  }

  private parseCsvUpdates(text: string): Array<{ sku: string; stock: number }> | null {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];

    const updates: Array<{ sku: string; stock: number }> = [];
    // Skip header row if first cell looks like 'sku' (case-insensitive)
    const startIdx = lines[0].toLowerCase().startsWith('sku') || lines[0].toLowerCase().startsWith('"sku') ? 1 : 0;

    for (let i = startIdx; i < lines.length; i++) {
      const cols = this.splitCsvLine(lines[i]);
      if (cols.length < 2) continue;
      const sku = cols[0].trim();
      const qty = Number(cols[1].trim());
      if (!sku || isNaN(qty) || qty < 0) continue;
      updates.push({ sku, stock: Math.floor(qty) });
    }
    return updates;
  }

  private splitCsvLine(line: string): string[] {
    // Simple CSV split supporting quoted fields
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { result.push(current); current = ''; }
      else { current += ch; }
    }
    result.push(current);
    return result;
  }

  private uploadUpdates(updates: Array<{ sku: string; stock: number }>): void {
    this.csvUploading = true;
    this.cdr.markForCheck();
    this.api.bulkUpdateInventory(updates).subscribe({
      next: (res) => {
        this.csvResult = res.data;
        this.csvUploading = false;
        // Refresh inventory list
        this.api.getOpsInventory().subscribe({
          next: (inv) => { this.inventory = inv.data; this.cdr.markForCheck(); },
          error: () => this.cdr.markForCheck(),
        });
      },
      error: () => {
        this.csvError = 'Error al actualizar el inventario. Intenta de nuevo.';
        this.csvUploading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private downloadCsv(rows: any[][], filename: string): void {
    const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
    URL.revokeObjectURL(a.href);
  }
}
