export interface StrapiPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface StrapiListResponse<T> {
  data: T[];
  meta?: {
    pagination: StrapiPagination;
  };
}

export interface StrapiItemResponse<T> {
  data: T;
  meta?: unknown;
}

export interface StorefrontMedia {
  id: number;
  url: string;
  alternativeText?: string | null;
  name?: string;
  formats?: Record<string, { url: string }>;
}

export interface StorefrontTaxonomyItem {
  id: number;
  documentId?: string;
  name?: string;
  slug?: string | null;
}

export interface StorefrontBrand extends StorefrontTaxonomyItem {}

export interface StorefrontRichTextNode {
  type: string;
  text?: string;
  url?: string | null;
  level?: number;
  format?: 'ordered' | 'unordered';
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  children?: StorefrontRichTextNode[];
}

export interface StorefrontProduct {
  id: number;
  documentId?: string;
  name: string;
  slug: string;
  description?: string | StorefrontRichTextNode[] | null;
  price: number;
  stock: number;
  category?: string | null;
  subcategory?: string | null;
  form?: string | null;
  proteinSource?: string | null;
  weightMinKg?: number;
  weightMaxKg?: number;
  publishedAt?: string | null;
  images: StorefrontMedia[];
  brand?: StorefrontBrand | null;
  speciesSupported?: StorefrontTaxonomyItem[];
  lifeStages?: StorefrontTaxonomyItem[];
  diet_tags?: StorefrontTaxonomyItem[];
  health_claims?: StorefrontTaxonomyItem[];
  ingredients?: StorefrontTaxonomyItem[];
}

export interface StorefrontProductsQuery {
  page?: number;
  pageSize?: number;
  sort?: string;
  search?: string;
  compact?: boolean;
  category?: string;
  subcategory?: string;
  form?: string;
  proteinSource?: string;
  brandId?: number;
  specieId?: number;
  lifeStageId?: number;
  dietTagIds?: number[];
  healthConditionIds?: number[];
  ingredientIds?: number[];
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  petProfileId?: number;
  strictPet?: boolean;
  featured?: boolean;
  excludeId?: number;
}

export interface StorefrontFacetValue {
  value: string;
  label: string;
  count: number;
}

export interface StorefrontCountedTaxonomyItem extends StorefrontTaxonomyItem {
  name: string;
  count: number;
}

export interface StorefrontProductFacets {
  categories: StorefrontFacetValue[];
  subcategories: StorefrontFacetValue[];
  brands: StorefrontCountedTaxonomyItem[];
  forms: StorefrontFacetValue[];
  proteinSources: StorefrontFacetValue[];
  species: StorefrontCountedTaxonomyItem[];
  lifeStages: StorefrontCountedTaxonomyItem[];
  dietTags: StorefrontCountedTaxonomyItem[];
  healthConditions: StorefrontCountedTaxonomyItem[];
  ingredients: StorefrontCountedTaxonomyItem[];
  priceRange: {
    min: number;
    max: number;
  };
  totalProducts: number;
}

export interface StorefrontCartItemProduct {
  id: number;
  documentId?: string;
  name: string;
  slug: string;
  price: number;
  stock: number;
  images: StorefrontMedia[];
  brand?: StorefrontBrand | null;
}

export interface StorefrontCartItem {
  id: number;
  documentId?: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  notes?: string | null;
  variant?: Record<string, unknown> | null;
  product: StorefrontCartItemProduct | null;
}

export type StorefrontCouponScope = 'global' | 'brand' | 'product' | 'mixed';

export interface StorefrontCouponTargetProduct {
  id: number;
  documentId?: string;
  name: string;
  slug?: string;
  brand?: StorefrontBrand | null;
}

export interface StorefrontCouponSummary {
  id: number;
  code: string;
  type: string;
  value: number;
  scope?: StorefrontCouponScope;
  eligibleBrands?: StorefrontBrand[];
  eligibleProducts?: StorefrontCouponTargetProduct[];
}

export interface StorefrontPublicCoupon {
  id: number;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  minSubtotal: number;
  scope?: StorefrontCouponScope;
  eligibleBrands?: StorefrontBrand[];
  eligibleProducts?: StorefrontCouponTargetProduct[];
  showInHeaderMarquee?: boolean;
  activeFrom?: string | null;
  activeTo?: string | null;
  usageLimit?: number | null;
  usageCount?: number;
  isActive: boolean;
  displayMessage: string;
}

export interface StorefrontHeaderAnnouncement {
  id: number;
  documentId?: string;
  title?: string | null;
  message: string;
  sortOrder?: number;
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface StorefrontShippingPolicy {
  freeShippingThreshold: number;
  qualifiesForFreeShipping: boolean;
  amountToFreeShipping: number;
  progressPct: number;
}

export interface StorefrontCart {
  id: number;
  documentId?: string;
  sessionKey?: string | null;
  currency: string;
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  grandTotal: number;
  membershipApplied: boolean;
  statusCart: string;
  expiresAt?: string | null;
  coupon?: StorefrontCouponSummary | null;
  shippingPolicy?: StorefrontShippingPolicy;
  items: StorefrontCartItem[];
}

export interface StorefrontAddCartItemPayload {
  productId: number | string;
  qty: number;
  notes?: string;
  variant?: Record<string, unknown>;
}

export interface StorefrontUpdateCartItemPayload {
  qty: number;
}

export interface StorefrontCheckoutAddress {
  fullName: string;
  phone: string;
  country: string;
  city: string;
  addressLine1: string;
  addressLine2?: string;
}

export type StorefrontShippingMethod = 'standard' | 'express';
export type StorefrontPaymentKind = 'card' | 'bank';

export interface StorefrontCheckoutPayload {
  email?: string;
  billingAddress: StorefrontCheckoutAddress;
  shippingAddress: StorefrontCheckoutAddress;
  shippingMethod?: StorefrontShippingMethod;
  paymentKind?: StorefrontPaymentKind;
}

export interface StorefrontOrderItem {
  id: number;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  nameSnapshot: string;
  sku?: string | null;
  product?: {
    id: number;
    documentId?: string;
    name: string;
    slug: string;
    images: StorefrontMedia[];
  } | null;
}

export interface StorefrontOrder {
  id: number;
  documentId?: string;
  orderNumber: string;
  email: string;
  currency: string;
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  grandTotal: number;
  membershipApplied: boolean;
  statusOrder: string;
  couponCode?: string | null;
  couponMeta?: {
    scope?: StorefrontCouponScope | null;
    eligibleSubtotal?: number;
    fundedByBrand?: StorefrontBrand | null;
    influencer?: {
      id: number;
      documentId?: string;
      username: string;
      firstName?: string | null;
      lastName?: string | null;
      fullName: string;
      avatar?: StorefrontMedia | null;
    } | null;
  } | null;
  billingAddress: Record<string, unknown>;
  shippingAddress: Record<string, unknown>;
  createdAt: string;
  order_items: StorefrontOrderItem[];
}

export interface StorefrontCheckoutResult {
  order: StorefrontOrder;
  nextCart: StorefrontCart;
}

export interface StorefrontUserPreferences {
  language: 'es' | 'en';
  currency: 'GTQ' | 'USD';
  timeZone: string;
  notifications: {
    orderUpdates: boolean;
    promotions: boolean;
    newsletter: boolean;
  };
  twoFactorEnabled: boolean;
}

export interface StorefrontUserProfile {
  id: number;
  documentId?: string;
  username: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  documentIdNumber?: string | null;
  birthDate?: string | null;
  avatar?: StorefrontMedia | null;
  fullName: string;
  membershipTier: 'free' | 'premium';
  membershipStartedAt?: string | null;
  preferences: StorefrontUserPreferences;
  stats: {
    orders: number;
    pets: number;
  };
}

export interface StorefrontUserProfilePayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  documentIdNumber?: string;
  birthDate?: string;
}

export interface StorefrontUserPreferencesPayload {
  language?: 'es' | 'en';
  currency?: 'GTQ' | 'USD';
  timeZone?: string;
  notifications?: {
    orderUpdates?: boolean;
    promotions?: boolean;
    newsletter?: boolean;
  };
  orderUpdates?: boolean;
  promotions?: boolean;
  newsletter?: boolean;
  twoFactorEnabled?: boolean;
}

export interface StorefrontMembership {
  tier: 'free' | 'premium';
  membershipStartedAt?: string | null;
  activePlan?: StorefrontMembershipPlan | null;
  availablePlans: StorefrontMembershipPlan[];
}

export interface StorefrontMembershipPlan {
  id: number;
  documentId?: string;
  name: string;
  slug?: string | null;
  price: number;
  description?: string | null;
  features: string[];
  isActive: boolean;
  publishedAt?: string | null;
}

export interface StorefrontMembershipPayload {
  tier?: 'free' | 'premium';
  membershipId?: number;
}

export interface StorefrontAddress {
  id: number;
  documentId?: string;
  label?: string | null;
  isDefault: boolean;
  fullName?: string | null;
  phone?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  postalCode?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  reference?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StorefrontAddressPayload {
  label?: string;
  isDefault?: boolean;
  fullName?: string;
  phone?: string;
  country?: string;
  state?: string;
  city?: string;
  postalCode?: string;
  addressLine1?: string;
  addressLine2?: string;
  reference?: string;
}

export interface StorefrontPet {
  id: number;
  documentId?: string;
  name: string;
  slug: string;
  breed?: string | null;
  color?: string | null;
  avatarHex?: string | null;
  birthdate?: string | null;
  weightKg?: number | null;
  size?: string | null;
  sex?: string | null;
  sterilized?: boolean | null;
  activity?: string | null;
  allergies: string[];
  notes?: string | null;
  avatar?: StorefrontMedia | null;
  specie?: StorefrontTaxonomyItem | null;
  lifeStage?: StorefrontTaxonomyItem | null;
  dietTags?: StorefrontTaxonomyItem[];
  healthConditions?: StorefrontTaxonomyItem[];
}

export interface StorefrontPetPayload {
  name?: string;
  breed?: string;
  color?: string;
  avatarHex?: string;
  birthdate?: string;
  weightKg?: number;
  size?: string;
  sex?: string;
  sterilized?: boolean;
  activity?: string;
  allergies?: string[];
  notes?: string;
  specieId?: number;
  lifeStageId?: number;
  dietTagIds?: number[];
  healthConditionIds?: number[];
}

export interface StorefrontPetTaxonomy {
  species: StorefrontTaxonomyItem[];
  lifeStages: StorefrontTaxonomyItem[];
  dietTags: StorefrontTaxonomyItem[];
  healthConditions: StorefrontTaxonomyItem[];
}

export type StorefrontCatalogFilterAvailability = 'available' | 'planned';

export interface StorefrontCatalogFilterDefinition {
  key: string;
  label: string;
  rationale: string;
  availability: StorefrontCatalogFilterAvailability;
  control: string | null;
}

export interface StorefrontCatalogTaxonomyLeaf {
  key: string;
  slug: string;
  label: string;
  matchTerms?: string[];
}

export interface StorefrontCatalogTaxonomySubcategory extends StorefrontCatalogTaxonomyLeaf {
  description: string;
  recommendedFilters: StorefrontCatalogFilterDefinition[];
  level4: StorefrontCatalogTaxonomyLeaf[];
}

export interface StorefrontCatalogTaxonomyCategory extends StorefrontCatalogTaxonomyLeaf {
  legacyCategory?: string | null;
  description: string;
  recommendedFilters: StorefrontCatalogFilterDefinition[];
  subcategories: StorefrontCatalogTaxonomySubcategory[];
}

export interface StorefrontCatalogTaxonomyAnimal extends StorefrontCatalogTaxonomyLeaf {
  description: string;
  legacySpeciesHints: string[];
  headline?: string;
  subtitle?: string;
  searchHint?: string;
  image?: StorefrontMedia | null;
  categories: StorefrontCatalogTaxonomyCategory[];
}

export interface StorefrontCatalogTaxonomy {
  version: string;
  generatedFrom?: string;
  filterLibrary: StorefrontCatalogFilterDefinition[];
  animals: StorefrontCatalogTaxonomyAnimal[];
}

export interface StorefrontDeletedResult {
  removed?: boolean;
  deleted?: boolean;
  blocked?: boolean;
  id?: number;
}
