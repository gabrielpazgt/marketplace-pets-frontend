export interface Address {
  country: string;
  department: string;
  municipality: string;
  line1: string;
  line2?: string;
  references?: string;
  postalCode?: string;
}

export interface ContactInfo {
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  nit?: string;
  saveInfo?: boolean;
}

export type PaymentKind = 'card' | 'bank';

export interface CardInfo {
  holder: string;
  number: string; // #### #### #### ####
  exp: string;    // MM/YY
  cvc: string;    // 3-4 digits
  brand?: 'visa' | 'mastercard' | 'amex' | 'other';
}

export interface ShippingMethod {
  id: 'standard' | 'express' | 'sameday';
  label: string;
  description: string;
  price: number;
  eta: string;
}
