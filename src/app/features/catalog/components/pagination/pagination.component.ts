import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss']
})
export class PaginationComponent {
  private _total = 0;
  private _page = 1;
  private _pageSize = 12;

  // 👇 Setter siempre recibe "cualquier cosa", y nosotros la
  // normalizamos a number; el getter SIEMPRE retorna number.
  @Input() set total(v: unknown)    { this._total    = Number(v ?? 0) || 0; }
  get total(): number               { return this._total; }

  @Input() set page(v: unknown)     { this._page     = Number(v ?? 1) || 1; }
  get page(): number                { return this._page; }

  @Input() set pageSize(v: unknown) { this._pageSize = Number(v ?? 12) || 12; }
  get pageSize(): number            { return this._pageSize; }

  @Output() pageChange = new EventEmitter<number>();

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total / this.pageSize));
  }

  private range(start: number, end: number): number[] {
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  get pages(): (number | 'gap')[] {
    const tp = this.totalPages;
    const p  = this.page;
    if (tp <= 7) return this.range(1, tp);
    if (p <= 4)  return [1, 2, 3, 4, 5, 'gap', tp];
    if (p >= tp - 3) return [1, 'gap', tp - 4, tp - 3, tp - 2, tp - 1, tp];
    return [1, 'gap', p - 1, p, p + 1, 'gap', tp];
  }

  // Helpers para no castear en el template
  isActive(p: number | 'gap'): boolean {
    return typeof p === 'number' && p === this.page;
  }
  ariaCurrent(p: number | 'gap'): 'page' | null {
    return this.isActive(p) ? 'page' : null;
  }

  go(n: number): void {
    const t = this.totalPages;
    if (n < 1 || n > t || n === this.page) return;
    this.pageChange.emit(n);
  }

  goPage(p: number | 'gap'): void {
    if (typeof p === 'number') this.go(p);
  }

  prev(): void { this.go(this.page - 1); }
  next(): void { this.go(this.page + 1); }
}
