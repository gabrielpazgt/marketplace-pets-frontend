import {
  StorefrontCatalogTaxonomy,
  StorefrontCatalogTaxonomyAnimal,
  StorefrontCatalogTaxonomyCategory,
  StorefrontCatalogTaxonomySubcategory,
  StorefrontFacetValue,
} from '../../core/models/storefront.models';

export type CatalogPetType = string;
export type CatalogCategoryKey = string;

export interface CatalogCategoryOption {
  value: string;
  label: string;
  shortLabel?: string;
  legacyCategory?: string | null;
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

export const DEFAULT_CATALOG_SEARCH_PLACEHOLDER = 'Buscar productos, marcas o necesidades';

export function normalizeCatalogValue(value?: string | null): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

export function humanizeCatalogValue(value?: string | null): string {
  const normalized = normalizeCatalogValue(value);
  if (!normalized) {
    return '';
  }

  return normalized
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function getCatalogAnimals(
  taxonomy?: StorefrontCatalogTaxonomy | null
): StorefrontCatalogTaxonomyAnimal[] {
  return taxonomy?.animals || [];
}

export function getCatalogPetByKey(
  taxonomy: StorefrontCatalogTaxonomy | null | undefined,
  key?: string | null
): CatalogPetConfig | null {
  const animal = findCatalogAnimal(taxonomy, key);
  return animal ? toCatalogPetConfig(animal) : null;
}

export function getCatalogPetBySlug(
  taxonomy: StorefrontCatalogTaxonomy | null | undefined,
  slug?: string | null
): CatalogPetConfig | null {
  const normalized = normalizeCatalogValue(slug);
  if (!normalized) {
    return null;
  }

  const animal = getCatalogAnimals(taxonomy).find(
    (entry) => normalizeCatalogValue(entry.slug || entry.key || '') === normalized
  );

  return animal ? toCatalogPetConfig(animal) : null;
}

export function matchCatalogPetFromTaxonomy(
  taxonomy: StorefrontCatalogTaxonomy | null | undefined,
  values: string[]
): CatalogPetConfig | null {
  const normalizedValues = Array.from(
    new Set((values || []).map((value) => normalizeCatalogValue(value)).filter(Boolean))
  );

  if (!normalizedValues.length) {
    return null;
  }

  const animal = getCatalogAnimals(taxonomy).find((entry) => {
    const terms = collectAnimalTerms(entry);
    return normalizedValues.some(
      (value) => terms.includes(value) || terms.some((term) => term.includes(value) || value.includes(term))
    );
  });

  return animal ? toCatalogPetConfig(animal) : null;
}

export function findCatalogAnimal(
  taxonomy: StorefrontCatalogTaxonomy | null | undefined,
  value?: string | null
): StorefrontCatalogTaxonomyAnimal | null {
  const normalized = normalizeCatalogValue(value);
  if (!normalized) {
    return null;
  }

  return getCatalogAnimals(taxonomy).find((entry) => collectAnimalTerms(entry).includes(normalized)) || null;
}

export function findCatalogCategoryByValue(
  taxonomy: StorefrontCatalogTaxonomy | null | undefined,
  petType?: string | null,
  value?: string | null
): StorefrontCatalogTaxonomyCategory | null {
  const normalized = normalizeCatalogValue(value);
  if (!normalized) {
    return null;
  }

  const activeAnimal = petType ? findCatalogAnimal(taxonomy, petType) : null;
  const pools = [
    ...(activeAnimal ? [activeAnimal] : []),
    ...getCatalogAnimals(taxonomy).filter((entry) => entry !== activeAnimal),
  ];

  for (const animal of pools) {
    const match = (animal.categories || []).find((category) => collectCategoryTerms(category).includes(normalized));
    if (match) {
      return match;
    }
  }

  return null;
}

export function findCatalogSubcategoryByValue(
  category: StorefrontCatalogTaxonomyCategory | null | undefined,
  value?: string | null
): StorefrontCatalogTaxonomySubcategory | null {
  const normalized = normalizeCatalogValue(value);
  if (!normalized || !category?.subcategories?.length) {
    return null;
  }

  return category.subcategories.find((entry) => collectSubcategoryTerms(entry).includes(normalized)) || null;
}

export function getCatalogCategoryLabel(
  taxonomy: StorefrontCatalogTaxonomy | null | undefined,
  category: string,
  petType?: string | null,
  fallbackFacets: StorefrontFacetValue[] = []
): string {
  const fromTaxonomy = findCatalogCategoryByValue(taxonomy, petType, category);
  if (fromTaxonomy?.label) {
    return fromTaxonomy.label;
  }

  const normalized = normalizeCatalogValue(category);
  const fromFacets = (fallbackFacets || []).find((item) => normalizeCatalogValue(item.value) === normalized);
  if (fromFacets?.label) {
    return fromFacets.label;
  }

  return humanizeCatalogValue(category) || 'Categoria';
}

export function getCatalogCategoryOptions(
  taxonomy: StorefrontCatalogTaxonomy | null | undefined,
  petType?: string | null,
  fallbackFacets: StorefrontFacetValue[] = []
): CatalogCategoryOption[] {
  const activeAnimal = petType ? findCatalogAnimal(taxonomy, petType) : null;
  const categories = activeAnimal?.categories?.length
    ? activeAnimal.categories
    : collectDistinctCategories(getCatalogAnimals(taxonomy));

  if (categories.length) {
    return categories.map((category) => ({
      value: resolveCategoryQueryValue(category),
      label: category.label,
      shortLabel: category.label,
      legacyCategory: normalizeCatalogValue(category.legacyCategory) || null,
    }));
  }

  return (fallbackFacets || []).map((item) => ({
    value: normalizeCatalogValue(item.value),
    label: item.label,
    shortLabel: item.label,
    legacyCategory: normalizeCatalogValue(item.value) || null,
  }));
}

export function resolveCategoryQueryValue(category: StorefrontCatalogTaxonomyCategory | null | undefined): string {
  return normalizeCatalogValue(category?.legacyCategory || category?.slug || category?.key || '');
}

export function collectSubcategoryTerms(subcategory: StorefrontCatalogTaxonomySubcategory): string[] {
  return Array.from(
    new Set(
      [
        subcategory.slug,
        subcategory.key,
        subcategory.label,
        ...(subcategory.matchTerms || []),
        ...(subcategory.level4 || []).flatMap((leaf) => [
          leaf.slug,
          leaf.key,
          leaf.label,
          ...(leaf.matchTerms || []),
        ]),
      ]
        .map((value) => normalizeCatalogValue(value))
        .filter(Boolean)
    )
  );
}

function toCatalogPetConfig(animal: StorefrontCatalogTaxonomyAnimal): CatalogPetConfig {
  const key = String(animal.key || animal.slug || animal.label || 'catalogo').trim().toLowerCase();
  const slug = String(animal.slug || animal.key || key).trim().toLowerCase();
  const label = String(animal.label || humanizeCatalogValue(animal.slug || animal.key || key) || 'Mascotas').trim();
  const categoryLabels: Partial<Record<CatalogCategoryKey, string>> = {};
  const subcategorySuggestions: Partial<Record<CatalogCategoryKey, string[]>> = {};

  for (const category of animal.categories || []) {
    const categoryKey = resolveCategoryQueryValue(category);
    if (!categoryKey) {
      continue;
    }

    categoryLabels[categoryKey] = category.label;
    subcategorySuggestions[categoryKey] = (category.subcategories || [])
      .map((item) => String(item.label || '').trim())
      .filter(Boolean);
  }

  return {
    key,
    slug,
    label,
    badge: label,
    headline: String(animal.headline || `Todo para ${label.toLowerCase()}`).trim(),
    subtitle: String(animal.subtitle || animal.description || '').trim(),
    searchHint: String(animal.searchHint || DEFAULT_CATALOG_SEARCH_PLACEHOLDER).trim(),
    taxonomyHints: collectAnimalTerms(animal),
    categoryLabels,
    subcategorySuggestions,
  };
}

function collectDistinctCategories(
  animals: StorefrontCatalogTaxonomyAnimal[]
): StorefrontCatalogTaxonomyCategory[] {
  const unique = new Map<string, StorefrontCatalogTaxonomyCategory>();

  for (const animal of animals || []) {
    for (const category of animal.categories || []) {
      const key = resolveCategoryQueryValue(category) || normalizeCatalogValue(category.label);
      if (!key || unique.has(key)) {
        continue;
      }

      unique.set(key, category);
    }
  }

  return Array.from(unique.values());
}

function collectAnimalTerms(animal: StorefrontCatalogTaxonomyAnimal): string[] {
  return Array.from(
    new Set(
      [
        animal.key,
        animal.slug,
        animal.label,
        animal.headline,
        ...(animal.legacySpeciesHints || []),
      ]
        .map((value) => normalizeCatalogValue(value))
        .filter(Boolean)
    )
  );
}

function collectCategoryTerms(category: StorefrontCatalogTaxonomyCategory): string[] {
  return Array.from(
    new Set(
      [
        category.slug,
        category.key,
        category.label,
        category.legacyCategory,
        ...(category.matchTerms || []),
      ]
        .map((value) => normalizeCatalogValue(value))
        .filter(Boolean)
    )
  );
}
