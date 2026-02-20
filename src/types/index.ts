export interface Profile {
  id: string;
  phone?: string;
  email?: string;
  name: string;
  avatar_url?: string;
  language: 'en' | 'ar-EG' | 'ar';
  currency: string;
  default_service_percentage: number;
  default_tax_percentage: number;
}

export interface Split {
  id: string;
  description: string;
  subtotal: number;
  total_amount: number;
  currency: string;
  has_service: boolean;
  service_percentage: number;
  service_amount: number;
  has_tax: boolean;
  tax_percentage: number;
  tax_amount: number;
  has_delivery_fee: boolean;
  delivery_fee: number;
  split_type: 'equal' | 'itemized' | 'percentage' | 'custom';
  service_tax_split_method: 'proportional' | 'equal';
  created_by: string;
  paid_by: string;
  receipt_url?: string;
  settled: boolean;
  created_at: string;
  updated_at: string;
}

export interface SplitParticipant {
  id: string;
  split_id: string;
  user_id: string;
  item_subtotal: number;
  service_share: number;
  tax_share: number;
  delivery_share: number;
  total_amount: number;
  amount_paid: number;
  status: 'pending' | 'paid' | 'forgiven';
  payment_method?: 'cash' | 'vodafone_cash' | 'instapay' | 'bank_transfer' | 'other';
  paid_at?: string;
  notes?: string;
}

export interface Item {
  id: string;
  split_id: string;
  name: string;
  price: number;
  ordered_by: string;
}

export interface Friend {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  balance: number;
  pending_splits_count: number;
}

export interface SplitWithParticipants extends Split {
  participants: SplitParticipant[];
  items?: Item[];
}

export interface CalculatedParticipant {
  user_id: string;
  item_subtotal: number;
  service_share: number;
  tax_share: number;
  delivery_share: number;
  total_amount: number;
}

export interface SplitCalculationResult {
  subtotal: number;
  service_amount: number;
  tax_amount: number;
  total_amount: number;
  participants: CalculatedParticipant[];
}

export type Language = 'en' | 'ar-EG' | 'ar';

export type Currency = 'EGP' | 'USD' | 'EUR';

export type SplitType = 'equal' | 'itemized' | 'percentage' | 'custom';

export type PaymentStatus = 'pending' | 'paid' | 'forgiven';

export type PaymentMethod = 'cash' | 'vodafone_cash' | 'instapay' | 'bank_transfer' | 'other';

export interface AuthUser {
  id: string;
  email?: string;
  phone?: string;
}

export interface Notification {
  id: string;
  type: 'payment_reminder' | 'new_split' | 'payment_received';
  split_id?: string;
  message: string;
  created_at: string;
  read: boolean;
}
