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
  logo?: StorefrontMedia | null;
}

export interface StorefrontBrand extends StorefrontTaxonomyItem {}

export interface StorefrontProductVariant {
  id: string;
  sku?: string | null;
  label: string;
  presentation?: string | null;
  size?: string | null;
  price: number;
  compareAtPrice?: number | null;
  stock: number;
  isDefault?: boolean;
  sortOrder?: number;
}

export interface StorefrontVariantSelection {
  id?: string;
  sku?: string | null;
  label?: string;
  presentation?: string | null;
  size?: string | null;
}

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

export interface StorefrontCatalogAnimalRef {
  id: number;
  documentId?: string;
  key: string;
  slug: string;
  label: string;
}

export interface StorefrontCatalogCategoryRef {
  id: number;
  documentId?: string;
  key: string;
  slug: string;
  label: string;
  level: string;
  legacyCategory?: string | null;
}

export interface StorefrontProduct {
  id: number;
  documentId?: string;
  name: string;
  slug: string;
  description?: string | StorefrontRichTextNode[] | null;
  characteristics?: StorefrontRichTextNode[] | null;
  benefits?: StorefrontRichTextNode[] | null;
  sku?: string | null;
  price: number;
  compareAtPrice?: number | null;
  badge?: 'NEW' | 'TOP' | 'SALE' | null;
  stock: number;
  variants?: StorefrontProductVariant[];
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
  catalogAnimals?: StorefrontCatalogAnimalRef[];
  catalogCategory?: StorefrontCatalogCategoryRef | null;
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
  animalKey?: string;
  categorySlug?: string;
  form?: string;
  forms?: string[];
  proteinSource?: string;
  proteinSources?: string[];
  brandId?: number;
  brandIds?: number[];
  specieId?: number;
  specieIds?: number[];
  lifeStageId?: number;
  lifeStageIds?: number[];
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
  compareAtPrice?: number | null;
  badge?: 'NEW' | 'TOP' | 'SALE' | null;
  stock: number;
  category?: string | null;
  subcategory?: string | null;
  form?: string | null;
  proteinSource?: string | null;
  images: StorefrontMedia[];
  brand?: StorefrontBrand | null;
  speciesSupported?: StorefrontTaxonomyItem[];
  catalogAnimals?: StorefrontCatalogAnimalRef[];
  catalogCategory?: StorefrontCatalogCategoryRef | null;
  lifeStages?: StorefrontTaxonomyItem[];
  diet_tags?: StorefrontTaxonomyItem[];
  health_claims?: StorefrontTaxonomyItem[];
  ingredients?: StorefrontTaxonomyItem[];
}

export interface StorefrontCartItem {
  id: number;
  documentId?: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  notes?: string | null;
  variant?: StorefrontVariantSelection | null;
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
  audience?: 'all' | 'guest' | 'account' | 'member' | null;
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

export interface StorefrontSettings {
  freeShippingThreshold: number;
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
  variant?: StorefrontVariantSelection;
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

export type StorefrontShippingMethod = 'standard' | 'express' | 'sameday';
export type StorefrontPaymentKind = 'card' | 'bank';

export interface StorefrontCheckoutPayload {
  email?: string;
  billingAddress: StorefrontCheckoutAddress;
  shippingAddress: StorefrontCheckoutAddress;
  shippingMethod?: StorefrontShippingMethod;
  paymentKind?: StorefrontPaymentKind;
}

export interface StorefrontOrderStatusLog {
  id: number;
  status: string;
  note?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

export interface StorefrontOrderItem {
  id: number;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  nameSnapshot: string;
  sku?: string | null;
  variant?: StorefrontVariantSelection | null;
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
  statusLogs?: StorefrontOrderStatusLog[];
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
  createdAt?: string;
  updatedAt?: string;
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
  catalogAnimal?: StorefrontCatalogAnimalRef | null;
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
  catalogAnimalId?: number;
  lifeStageId?: number;
  dietTagIds?: number[];
  healthConditionIds?: number[];
}

export interface StorefrontPetTaxonomy {
  catalogAnimals: StorefrontCatalogAnimalRef[];
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
  image?: StorefrontMedia | null;
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

// ── Portal Operativo ──────────────────────────────────────────────────────
export interface OpsMetrics {
  totalOrders: number;
  revenueMonth: number;
  pendingOrders: number;
  ordersToday: number;
  recentOrders: OpsOrder[];
}

export interface OpsOrder {
  id: number;
  orderNumber: string;
  email: string;
  subtotal?: number;
  shippingTotal?: number;
  discountTotal?: number;
  grandTotal: number;
  statusOrder: string;
  createdAt: string;
  customerName?: string;
  shippingAddress?: {
    fullName?: string;
    line1?: string;
    line2?: string;
    municipality?: string;
    department?: string;
    zipCode?: string;
    country?: string;
  };
  items?: Array<{
    nameSnapshot: string;
    sku?: string | null;
    qty: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  paymentKind?: string;
  statusLogs?: StorefrontOrderStatusLog[];
}

export interface OpsMetricsEnhanced {
  period: 'today' | 'week' | 'month';
  totalOrders: number;
  revenueMonth: number;
  revenueLastMonth: number;
  revenuePeriod: number;
  revenuePrev: number;
  revenueToday: number;
  revenueYesterday: number;
  avgOrderValue: number;
  pendingOrders: number;
  processingOrders: number;
  shippedOrders: number;
  ordersToday: number;
  cancellationRate: number;
  membershipOrdersCount: number;
  recentOrders: OpsOrder[];
}

export interface OpsSalesReportPeriod {
  period: string;
  ordersCount: number;
  grossRevenue: number;
  shippingRevenue: number;
  totalDiscounts: number;
  netRevenue: number;
  avgOrderValue: number;
}

export interface OpsSalesReport {
  periods: OpsSalesReportPeriod[];
  totals: OpsSalesReportPeriod;
  byPaymentKind: Array<{ kind: string; count: number; revenue: number }>;
  membershipOrdersCount: number;
}

export interface OpsTopProduct {
  name: string;
  sku?: string;
  totalQty: number;
  totalRevenue: number;
  ordersCount: number;
}

export interface OpsTopCustomer {
  email: string;
  customerName?: string;
  ordersCount: number;
  totalSpent: number;
  lastOrderAt: string;
}

export interface OpsInventoryVariant {
  id: string;
  label: string;
  sku?: string;
  price: number;
  stock: number;
  lowStockAlert: boolean;
}

export interface OpsInventoryItem {
  id: number;
  name: string;
  sku?: string;
  price: number;
  stock: number | null;
  hasVariants: boolean;
  variants: OpsInventoryVariant[];
  brand?: { name: string };
  lowStockAlert: boolean;
  isActive: boolean;
}

export interface OpsInventory {
  summary: {
    totalProducts: number;
    outOfStock: number;
    lowStock: number;
    noTracking: number;
  };
  products: OpsInventoryItem[];
}

export interface OpsFinances {
  year: number;
  month: number;
  grossRevenue: number;
  netRevenue: number;
  totalDiscounts: number;
  shippingRevenue: number;
  ordersCount: number;
  avgOrderValue: number;
  membershipOrdersCount: number;
  byPaymentKind: Array<{ kind: string; count: number; revenue: number }>;
  commissions: Array<{ influencerName: string; couponCode: string; ordersCount: number; totalCommission: number }>;
}

export interface StorefrontFilterScopeEntry {
  filterKey: string;
  sortOrder: number;
}

export interface StorefrontFilterScope {
  filterKeys: string[];
  filters: StorefrontFilterScopeEntry[];
}
