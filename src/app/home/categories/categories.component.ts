import { ChangeDetectionStrategy, Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';

export interface Category {
  slug: string;
  name: string;
  image: string; // ruta absoluta o relativa dentro de assets/
}

@Component({
  selector: 'app-categories',
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoriesComponent implements OnInit, OnChanges {
  /** Si quieres sobreescribir desde fuera, puedes pasar un array. Si no, se usan los defaults. */
  @Input() categories: Category[] | null | undefined;

  /** Carpeta base de imágenes (por si la cambias a futuro) */
  @Input() basePath = 'assets/images/categories';

  /** Datos que realmente se pintan (o defaults si no llegó nada) */
  data: Category[] = [];

  /** Nombres de archivos por defecto (los que dijiste que ya tienes) */
  private readonly fileMap = {
    perros: 'dogs.png',
    gatos: 'cats.png',
    higiene: 'bath.png',
    snacks: 'snacks.png',
    juguetes: 'toys.png', 
    accesorios: 'accesories.png'
  } as const;

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
      // Normaliza rutas: si no empiezan con 'assets/', antepone basePath
      return incoming.map(c => ({
        ...c,
        image: this.normalizeImage(c.image)
      }));
    }

    // Defaults locales (autosuficiente)
    return [
      { slug: 'perros',     name: 'Perros',     image: `${this.basePath}/${this.fileMap.perros}` },
      { slug: 'gatos',      name: 'Gatos',      image: `${this.basePath}/${this.fileMap.gatos}` },
      { slug: 'higiene',    name: 'Higiene',    image: `${this.basePath}/${this.fileMap.higiene}` },
      { slug: 'snacks',     name: 'Snacks',     image: `${this.basePath}/${this.fileMap.snacks}` },
      { slug: 'juguetes',   name: 'Juguetes',   image: `${this.basePath}/${this.fileMap.juguetes}` },
      { slug: 'accesorios', name: 'Accesorios', image: `${this.basePath}/${this.fileMap.accesorios}` },
    ];
  }

  private normalizeImage(img: string): string {
    // Si ya viene como 'assets/...', lo dejamos; si no, lo unimos a basePath
    if (!img) return `${this.basePath}/placeholder.png`;
    return img.startsWith('assets/') ? img : `${this.basePath}/${img}`;
  }
}
