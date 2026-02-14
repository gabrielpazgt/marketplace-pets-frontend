import { Component, EventEmitter, Input, Output } from '@angular/core';

type SortType = 'popular' | 'price-asc' | 'price-desc' | 'new';

@Component({
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

  onSortChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value as SortType;
    this.sortChange.emit(value);
  }
}
