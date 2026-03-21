import { Component, EventEmitter, Input, Output } from '@angular/core';

type SortType = 'popular' | 'price-asc' | 'price-desc' | 'new';

@Component({
  standalone: false,
  selector: 'app-sort-bar',
  templateUrl: './sort-bar.component.html',
  styleUrls: ['./sort-bar.component.scss']
})
export class SortBarComponent {
  @Input() total = 0;
  @Input() sort: SortType = 'popular';
  @Input() activeFilters = 0;               

  @Output() sortChange = new EventEmitter<SortType>();
  @Output() openFilters = new EventEmitter<void>();

  get sortLabel(): string {
    if (this.sort === 'new') return 'Novedades';
    if (this.sort === 'price-asc') return 'Precio: menor a mayor';
    if (this.sort === 'price-desc') return 'Precio: mayor a menor';
    return 'Más populares';
  }

  onSortChange(value: SortType) {
    this.sortChange.emit(value);
  }
}
