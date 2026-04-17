import { ChangeDetectionStrategy, Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';

export interface Category {
  slug: string;
  name: string;
  image: string; // ruta absoluta o relativa dentro de assets/
  count?: number;
}

@Component({
  standalone: false,
  selector: 'app-categories',
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoriesComponent implements OnInit, OnChanges {
  /** Si quieres sobreescribir desde fuera, puedes pasar un array. Si no, se usan los defaults. */
  @Input() categories: Category[] | null | undefined;

  /** Carpeta base de imágenes */
  @Input() basePath = 'assets/home';

  /** Datos que realmente se pintan (o defaults si no llegó nada) */
  data: Category[] = [];

  /** Nombres de archivos disponibles en assets/home/ */
  private readonly fileMap = {
    perros:   'dogs.webp',
    gatos:    'cats.webp',
    aves:     'bird.webp',
    reptiles: 'reptile.webp',
    peces:    'fish.webp',
    roedores: 'hamster.webp',
  } as const;

  /** Mapa slug → webp local curado: tiene prioridad sobre cualquier URL de la API */
  private readonly SLUG_IMAGE: Record<string, string> = {
    'perros':   'assets/home/dogs.webp',
    'gatos':    'assets/home/cats.webp',
    'aves':     'assets/home/bird.webp',
    'reptiles': 'assets/home/reptile.webp',
    'peces':    'assets/home/fish.webp',
    'roedores': 'assets/home/hamster.webp',
  };

  ngOnInit(): void {
    this.data = this.resolveData(this.categories);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['categories'] || changes['basePath']) {
      this.data = this.resolveData(this.categories);
    }
  }

  /** Si llegan categorías por @Input, las usa; si no, construye los defaults con las rutas de assets */
  private resolveData(input?: Category[] | null): Category[] {
    const incoming = (input ?? []).filter(Boolean) as Category[];

    if (incoming.length) {
      // Si el slug tiene imagen local curada, la usa; si no, normaliza la URL de la API
      return incoming.map(c => ({
        ...c,
        image: this.SLUG_IMAGE[c.slug] ?? this.normalizeImage(c.image)
      }));
    }

    // Defaults locales — perros y gatos primeros para mayor prominencia
    return [
      { slug: 'perros',   name: 'Perros',               image: `${this.basePath}/${this.fileMap.perros}` },
      { slug: 'gatos',    name: 'Gatos',                image: `${this.basePath}/${this.fileMap.gatos}` },
      { slug: 'aves',     name: 'Aves',                 image: `${this.basePath}/${this.fileMap.aves}` },
      { slug: 'reptiles', name: 'Reptiles',             image: `${this.basePath}/${this.fileMap.reptiles}` },
      { slug: 'peces',    name: 'Peces y acuario',      image: `${this.basePath}/${this.fileMap.peces}` },
      { slug: 'roedores', name: 'Roedor y pequeña m.',  image: `${this.basePath}/${this.fileMap.roedores}` },
    ];
  }

  private normalizeImage(img: string): string {
    // Si ya viene como 'assets/...', lo dejamos; si no, lo unimos a basePath
    if (!img) return `${this.basePath}/placeholder.png`;
    return img.startsWith('assets/') ? img : `${this.basePath}/${img}`;
  }
}
