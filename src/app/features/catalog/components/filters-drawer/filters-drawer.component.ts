import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core';
import { FormBuilder } from '@angular/forms';

export interface FilterState {
  tags: string[];
  min?: number | null;
  max?: number | null;
}

@Component({
  selector: 'app-filters-drawer',
  templateUrl: './filters-drawer.component.html',
  styleUrls: ['./filters-drawer.component.scss']
})
export class FiltersDrawerComponent implements OnChanges {
  @Input() open = false;
  @Input() availableTags: string[] = ['higiene', 'snacks', 'juguetes', 'accesorios', 'alimento'];
  @Input() state: FilterState = { tags: [], min: null, max: null };

  @Output() apply = new EventEmitter<FilterState>();
  @Output() close = new EventEmitter<void>();
  @Output() clear = new EventEmitter<void>();

  form = this.fb.group({
    tags: this.fb.nonNullable.control<string[]>([]),
    min: this.fb.control<number | null>(null),
    max: this.fb.control<number | null>(null),
  });

  constructor(private fb: FormBuilder) {}

  ngOnChanges() {
    this.form.setValue({
      tags: this.state.tags ?? [],
      min: this.state.min ?? null,
      max: this.state.max ?? null,
    }, { emitEvent: false });
  }

  onTagChange(tag: string, ev: Event) {
    const checked = (ev.target as HTMLInputElement).checked;
    const current = this.form.controls.tags.value ?? [];
    if (checked) {
      if (!current.includes(tag)) this.form.controls.tags.setValue([...current, tag]);
    } else {
      this.form.controls.tags.setValue(current.filter(x => x !== tag));
    }
  }

  onSubmit() {
    const { tags, min, max } = this.form.getRawValue();
    this.apply.emit({ tags, min, max });
  }

  get activeCount(): number {
    const v = this.form.getRawValue();
    return (v.tags?.length || 0) + (v.min ? 1 : 0) + (v.max ? 1 : 0);
  }
}
