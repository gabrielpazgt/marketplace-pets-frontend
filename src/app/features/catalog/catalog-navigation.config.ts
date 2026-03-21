export type CatalogPetType = 'dog' | 'cat' | 'bird' | 'fish' | 'reptile' | 'small-pet' | 'horse';
export type CatalogCategoryKey = 'food' | 'treats' | 'hygiene' | 'health' | 'accesories' | 'other';

export interface CatalogCategoryOption {
  value: CatalogCategoryKey;
  label: string;
  shortLabel?: string;
}

export interface CatalogPetConfig {
  key: CatalogPetType;
  slug: string;
  label: string;
  badge: string;
  headline: string;
  subtitle: string;
  searchHint: string;
  taxonomyHints: string[];
  categoryLabels?: Partial<Record<CatalogCategoryKey, string>>;
  subcategorySuggestions?: Partial<Record<CatalogCategoryKey, string[]>>;
}

export const BASE_CATALOG_CATEGORIES: CatalogCategoryOption[] = [
  { value: 'food', label: 'Alimento' },
  { value: 'treats', label: 'Premios y snacks', shortLabel: 'Snacks' },
  { value: 'hygiene', label: 'Higiene y cuidado', shortLabel: 'Higiene' },
  { value: 'health', label: 'Salud y bienestar', shortLabel: 'Salud' },
  { value: 'accesories', label: 'Accesorios y juego', shortLabel: 'Accesorios' },
  { value: 'other', label: 'Especialidades', shortLabel: 'Otros' },
];

export const CATALOG_PETS: CatalogPetConfig[] = [
  {
    key: 'dog',
    slug: 'perros',
    label: 'Perros',
    badge: 'Perros',
    headline: 'Todo para perros',
    subtitle: 'Compra alimento, salud, paseo, premios y accesorios con filtros pensados para perros.',
    searchHint: 'Buscar alimento, premios, higiene o accesorios para perros',
    taxonomyHints: ['perro', 'dog'],
    subcategorySuggestions: {
      food: ['Seco', 'Humedo', 'Veterinario', 'Natural', 'Toppers'],
      treats: ['Dentales', 'Entrenamiento', 'Naturales', 'Funcionales'],
      health: ['Articulaciones', 'Digestivo', 'Piel y pelaje', 'Desparasitacion'],
    },
  },
  {
    key: 'cat',
    slug: 'gatos',
    label: 'Gatos',
    badge: 'Gatos',
    headline: 'Todo para gatos',
    subtitle: 'Explora arena, alimento, salud, rascadores y soluciones para el bienestar de tu gato.',
    searchHint: 'Buscar alimento, arena, premios o salud para gatos',
    taxonomyHints: ['gato', 'cat'],
    categoryLabels: {
      hygiene: 'Arena y limpieza',
      accesories: 'Juguetes y accesorios',
    },
    subcategorySuggestions: {
      food: ['Seco', 'Humedo', 'Veterinario', 'Natural'],
      hygiene: ['Arena aglomerante', 'Silica', 'Tofu', 'Areneros'],
      accesories: ['Rascadores', 'Torres', 'Camas', 'Fuentes'],
    },
  },
  {
    key: 'bird',
    slug: 'aves',
    label: 'Aves',
    badge: 'Aves',
    headline: 'Todo para aves',
    subtitle: 'Encuentra alimento, jaulas, perchas, juguetes y cuidado diario para aves de compania.',
    searchHint: 'Buscar alimento, jaulas o accesorios para aves',
    taxonomyHints: ['ave', 'bird', 'loro', 'perico', 'canario'],
    categoryLabels: {
      treats: 'Premios',
      accesories: 'Jaulas y accesorios',
    },
    subcategorySuggestions: {
      food: ['Semillas', 'Pellets', 'Suplementos'],
      accesories: ['Jaulas', 'Perchas', 'Juguetes', 'Bebederos'],
    },
  },
  {
    key: 'fish',
    slug: 'peces',
    label: 'Peces y acuario',
    badge: 'Acuario',
    headline: 'Todo para peces y acuario',
    subtitle: 'Compra alimento, filtros, agua, decoracion y equipo para acuarios de agua dulce o marinos.',
    searchHint: 'Buscar alimento, filtros o cuidado del agua',
    taxonomyHints: ['pez', 'peces', 'fish', 'acuario', 'aquarium'],
    categoryLabels: {
      hygiene: 'Limpieza y mantenimiento',
      health: 'Cuidado del agua',
      accesories: 'Acuarios y equipo',
    },
    subcategorySuggestions: {
      food: ['Agua dulce', 'Marino', 'Peces tropicales'],
      accesories: ['Acuarios', 'Filtros', 'Bombas', 'Iluminacion'],
      health: ['Acondicionadores', 'Bacterias', 'Test kits'],
    },
  },
  {
    key: 'reptile',
    slug: 'reptiles',
    label: 'Reptiles',
    badge: 'Reptiles',
    headline: 'Todo para reptiles y anfibios',
    subtitle: 'Terrarios, UVB, sustratos, feeders y accesorios para reptiles y anfibios.',
    searchHint: 'Buscar terrarios, UVB, alimento o sustratos',
    taxonomyHints: ['reptil', 'reptile', 'tortuga', 'iguana', 'serpiente', 'anfibio'],
    categoryLabels: {
      food: 'Alimento y feeders',
      hygiene: 'Sustratos y limpieza',
      accesories: 'Terrarios y equipo',
    },
    subcategorySuggestions: {
      food: ['Feeders', 'Pellets', 'Tortugas'],
      accesories: ['Terrarios', 'UVB', 'Calefaccion', 'Refugios'],
    },
  },
  {
    key: 'small-pet',
    slug: 'pequenas-mascotas',
    label: 'Roedores y pequenas mascotas',
    badge: 'Pequenas',
    headline: 'Todo para roedores y pequenas mascotas',
    subtitle: 'Conejos, hamsters, cobayos y mas con alimento, habitat, sustrato y enriquecimiento.',
    searchHint: 'Buscar alimento, habitat o cama para pequenas mascotas',
    taxonomyHints: ['hamster', 'conejo', 'rabbit', 'cobayo', 'cuy', 'huron', 'chinchilla', 'small'],
    categoryLabels: {
      hygiene: 'Cama e higiene',
      accesories: 'Habitats y juego',
    },
    subcategorySuggestions: {
      food: ['Conejos', 'Hamsters', 'Cobayos'],
      hygiene: ['Viruta', 'Pellets', 'Sustrato'],
      accesories: ['Jaulas', 'Casas', 'Ruedas', 'Bebederos'],
    },
  },
  {
    key: 'horse',
    slug: 'caballos',
    label: 'Caballos',
    badge: 'Caballos',
    headline: 'Todo para caballos',
    subtitle: 'Concentrado, suplementos, cuidado diario y equipo con filtros pensados para equinos.',
    searchHint: 'Buscar concentrado, suplementos o equipo para caballo',
    taxonomyHints: ['caballo', 'horse', 'equino'],
    categoryLabels: {
      health: 'Suplementos y soporte',
      hygiene: 'Cuidado diario',
      accesories: 'Equipo y montura',
    },
    subcategorySuggestions: {
      food: ['Concentrado adulto', 'Concentrado potro', 'Concentrado deportivo'],
      health: ['Articulaciones', 'Electrolitos', 'Digestivos'],
      hygiene: ['Cascos', 'Cepillos', 'Shampoo'],
      accesories: ['Montura', 'Riendas', 'Mantillas'],
    },
  },
];

export function getCatalogPetByKey(key?: string | null): CatalogPetConfig | null {
  const normalized = String(key || '').trim().toLowerCase();
  return CATALOG_PETS.find((pet) => pet.key === normalized) || null;
}

export function getCatalogPetBySlug(slug?: string | null): CatalogPetConfig | null {
  const normalized = String(slug || '').trim().toLowerCase();
  return CATALOG_PETS.find((pet) => pet.slug === normalized) || null;
}

export function getCatalogCategoryLabel(
  category: CatalogCategoryKey,
  petType?: CatalogPetType | null
): string {
  const pet = getCatalogPetByKey(petType);
  return pet?.categoryLabels?.[category] || BASE_CATALOG_CATEGORIES.find((item) => item.value === category)?.label || category;
}

export function matchCatalogPetFromTaxonomy(values: string[]): CatalogPetConfig | null {
  const normalized = values
    .map((value) => String(value || '').trim().toLowerCase())
    .filter(Boolean);

  return CATALOG_PETS.find((pet) => pet.taxonomyHints.some((hint) => normalized.includes(hint))) || null;
}
