export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'staff' | 'customer'
export type SchemeType = 'fixed' | 'gold_rate_linked'
export type ChitStatus = 'active' | 'redeemed' | 'closed' | 'defaulted'
export type PaymentMode = 'cash' | 'upi' | 'bank_transfer' | 'cheque'
export type ReminderStatus = 'pending' | 'sent' | 'failed'
export type ReminderChannel = 'sms' | 'whatsapp' | 'manual'
export type GiftDeliveryStatus = 'eligible' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'claimed'
export type GiftCategory = 'referral_gift' | 'scheme_maturity_gift' | 'festival_gift' | 'vip_bonus'

export interface GiftItem {
  id: string
  name: string
  description: string | null
  category: GiftCategory
  image_url: string | null
  required_referrals: number
  gift_value: number
  is_active: boolean
  created_at: string
}

export interface CustomerGift {
  id: string
  customer_id: string
  gift_item_id: string
  gift_code: string
  eligibility_reason: string
  is_eligible: boolean
  delivery_status: GiftDeliveryStatus
  shipping_address: string | null
  tracking_number: string | null
  courier_partner: string | null
  claimed_at: string | null
  delivered_at: string | null
  created_at: string
  gift_item?: GiftItem
}

export interface Profile {
  id: string
  role: UserRole
  full_name: string | null
  phone: string | null
  secondary_phone?: string | null
  email: string | null
  avatar_url: string | null
  address?: string | null
  nominee_name?: string | null
  nominee_relation?: string | null
  dob?: string | null
  anniversary_date?: string | null
  shop_id: string | null
  is_active: boolean
  is_verified?: boolean
  created_at: string
}

export interface Customer {
  id: string
  name: string
  first_name?: string | null
  last_name?: string | null
  phone: string
  address: string | null
  door_no?: string | null
  flat_name?: string | null
  street?: string | null
  landmark?: string | null
  area?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
  dob?: string | null
  anniversary_date?: string | null
  nominee_name?: string | null
  nominee_relationship?: string | null
  nominee_phone?: string | null
  bank_name?: string | null
  account_number?: string | null
  ifsc_code?: string | null
  bank_branch?: string | null
  photo_url: string | null
  id_proof_url: string | null
  assigned_staff_id: string | null
  created_by: string | null
  is_verified?: boolean
  created_at: string
  updated_at: string
  updated_by: string | null
}

export interface CustomerWithStats extends Customer {
  active_chit_count: number
  total_outstanding: number
  assigned_staff?: Pick<Profile, 'id' | 'full_name'>
}

export interface Scheme {
  id: string
  name: string
  description: string | null
  duration_months: number
  scheme_type: SchemeType
  min_installment: number
  bonus_months: number
  bonus_type: 'months' | 'gift' | 'both' | null
  gift_description: string | null
  gift_value: number | null
  is_active: boolean
  created_by: string | null
  created_at: string
}

export interface CustomerChit {
  id: string
  customer_id: string
  scheme_id: string
  start_date: string
  maturity_date: string
  monthly_due_day: number
  agreed_amount: number | null
  status: ChitStatus
  enrolled_by: string | null
  redemption_amount: number | null
  redemption_note: string | null
  redeemed_at: string | null
  created_at: string
  customer?: Customer
  scheme?: Scheme
}

export interface Payment {
  id: string
  customer_chit_id: string
  customer_id: string
  amount: number
  payment_date: string
  payment_mode: PaymentMode
  recorded_by: string | null
  notes: string | null
  created_at: string
  gold_weight_grams?: number | null
  gold_rate?: number | null
  customer?: Customer
  customer_chit?: CustomerChit
  recorder?: Pick<Profile, 'id' | 'full_name'>
}

export interface GoldRate {
  id: string
  date: string
  rate_22k: number
  rate_24k: number
  rate_18k: number
  silver_rate: number
  created_by: string | null
  updated_by: string | null
  updated_at: string
  created_at: string
}

export interface Reminder {
  id: string
  customer_id: string
  customer_chit_id: string | null
  status: ReminderStatus
  message: string
  sent_at: string | null
  sent_by: string | null
  channel: ReminderChannel
  created_at: string
  customer?: Customer
}

export interface ReminderTemplate {
  id: string
  language: 'en' | 'ta'
  title: string
  body: string
  is_active: boolean
  created_at: string
}

export interface AuditLog {
  id: string
  table_name: string
  record_id: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  changed_by: string | null
  changed_at: string
  diff_json: Json | null
  changer?: Pick<Profile, 'id' | 'full_name'>
}

export interface BusinessProfile {
  id: string
  shop_name: string
  address: string | null
  logo_url: string | null
  gstin: string | null
  phone: string | null
  email: string | null
  updated_at: string
}

export interface PromoBanner {
  id: string
  title: string
  description?: string | null
  image_url: string
  target_link?: string | null
  is_active: boolean
  display_order: number
  created_at: string
}

export interface DashboardKPIs {
  total_active_customers: number
  total_active_chits: number
  todays_collection: number
  monthly_collection: number
  total_outstanding: number
  overdue_count: number
  maturities_next_30d: number
  gold_rate_22k_today: number | null
  gold_rate_22k_yesterday: number | null
  weekly_collections?: { day: string; amount: number }[]
}
