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
  saveInfo?: boolean;
}

export type PaymentKind = 'card' | 'bank' | 'cod';

export interface CardInfo {
  holder: string;
  number: string; // #### #### #### ####
  exp: string;    // MM/YY
  cvc: string;    // 3-4 digits
}

export interface ShippingMethod {
  id: 'standard' | 'express' | 'pickup';
  label: string;
  description: string;
  price: number;
  eta: string;
}
