import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { SeoService } from '../../core/services/seo.service';
import { HomeDataService } from '../home.data';
import { Category, Product } from '../home.models';


@Component({
  standalone: false,
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  categories$!: Observable<Category[]>;
  featured$!: Observable<Product[]>;

  constructor(
    private data: HomeDataService,
    private seo: SeoService
  ) {}

  ngOnInit(): void {
    const siteUrl = this.seo.absoluteUrl('/home');
    this.seo.setPage({
      title: 'Aumakki | Tienda online para mascotas en Guatemala',
      description: 'Compra alimento, salud, higiene, accesorios y novedades para perros, gatos y otras mascotas desde una tienda online pensada para Guatemala.',
      url: '/home',
      keywords: [
        'tienda de mascotas Guatemala',
        'productos para perros Guatemala',
        'productos para gatos Guatemala',
        'alimento para mascotas Guatemala',
        'Aumakki',
      ],
      structuredData: [
        {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'Aumakki',
          url: siteUrl.replace(/\/home$/, '/'),
          potentialAction: {
            '@type': 'SearchAction',
            target: `${this.seo.absoluteUrl('/catalog')}?search={search_term_string}`,
            'query-input': 'required name=search_term_string',
          },
        },
        {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'Aumakki',
          url: siteUrl.replace(/\/home$/, '/'),
          email: 'hola@aumakki.com',
        },
      ],
    });

    this.categories$ = this.data.getCategories();
    this.featured$   = this.data.getFeatured();
  }
}
