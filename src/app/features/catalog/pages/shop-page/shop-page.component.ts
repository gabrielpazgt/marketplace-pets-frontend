import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { combineLatest } from 'rxjs';
import { CatalogMockService } from '../../services/catalog-mock.service';
import { Product } from '../../models/product.model';
import { FilterState } from '../../components/filters-drawer/filters-drawer.component';

type SortType = 'popular' | 'price-asc' | 'price-desc' | 'new';

interface NavQuery {
  sort?: SortType;
  page?: number;
  pageSize?: number;
  min?: number | null;
  max?: number | null;
  tag?: string[];
}

@Component({
  selector: 'app-shop-page',
  templateUrl: './shop-page.component.html',
  styleUrl: './shop-page.component.scss'
})
export class ShopPageComponent implements OnInit {
  slug: string | null = null;
  loading = true;
  items: Product[] = [];
  total = 0;

  sort: SortType = 'popular';
  page = 1;
  pageSize = 12;
  filters: FilterState = { tags: [], min: null, max: null };

  filtersOpen = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: CatalogMockService
  ) {}

  ngOnInit() {
    combineLatest([this.route.paramMap, this.route.queryParamMap]).subscribe(([pm, qp]) => {
      this.slug = pm.get('slug');
      this.sort = (qp.get('sort') as SortType) || 'popular';
      this.page = +(qp.get('page') || 1);
      this.pageSize = +(qp.get('pageSize') || 12);

      const tags = qp.getAll('tag');
      const min = qp.get('min');
      const max = qp.get('max');
      this.filters = {
        tags,
        min: min ? +min : null,
        max: max ? +max : null,
      };

      void this.fetch();
    });
  }

  private async fetch() {
    this.loading = true;
    const res = await this.api.search({
      category: this.slug ?? undefined,
      tags: this.filters.tags,
      min: this.filters.min ?? undefined,
      max: this.filters.max ?? undefined,
      sort: this.sort,
      page: this.page,
      pageSize: this.pageSize,
    });

    this.items = res.items;
    this.total = res.total;
    this.loading = false;
  }

  onOpenFilters() { this.filtersOpen = true; }
  onCloseFilters() { this.filtersOpen = false; }

  onApplyFilters(f: FilterState) {
    this.filtersOpen = false;
    this.page = 1;
    this.navigateWith({
      page: this.page,
      sort: this.sort,
      min: f.min ?? null,
      max: f.max ?? null,
      tag: f.tags,
    });
  }

  onClearFilters() {
    this.filtersOpen = false;
    this.page = 1;
    this.navigateWith({ page: 1, sort: this.sort, min: null, max: null, tag: [] });
  }

  onSortChange(s: SortType) {
    this.sort = s;
    this.page = 1;
    this.navigateWith({
      page: this.page,
      sort: s,
      min: this.filters.min ?? null,
      max: this.filters.max ?? null,
      tag: this.filters.tags
    });
  }

  onPageChange(n: number) {
    this.page = Number(n);
    this.navigateWith({
      page: this.page,
      sort: this.sort,
      min: this.filters.min ?? null,
      max: this.filters.max ?? null,
      tag: this.filters.tags
    });
  }

  private navigateWith(q: NavQuery) {
    const qp: Params = {};

    if (q.sort !== undefined) qp['sort'] = q.sort;
    if (q.page !== undefined) qp['page'] = q.page;
    if (q.pageSize !== undefined) qp['pageSize'] = q.pageSize;
    if (q.min !== undefined) qp['min'] = q.min;
    if (q.max !== undefined) qp['max'] = q.max;

    const tag = q.tag ?? this.filters.tags;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { ...qp, tag },
      queryParamsHandling: 'merge',
    });
  }
}
