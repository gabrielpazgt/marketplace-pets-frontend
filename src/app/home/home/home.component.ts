import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { HomeDataService } from '../home.data';
import { Category, Product } from '../home.models';


@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  categories$!: Observable<Category[]>;
  featured$!: Observable<Product[]>;

  constructor(private data: HomeDataService) {}

  ngOnInit(): void {
    this.categories$ = this.data.getCategories();
    this.featured$   = this.data.getFeatured();
  }
}
