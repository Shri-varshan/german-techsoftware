import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type UserRole = 'owner' | 'staff';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  customer_id: string;
  make: string;
  model: string;
  year: number | null;
  number_plate: string;
  vin: string;
  colour: string;
  fuel_type: string;
  current_km: number;
  public_token: string;
  next_service_date: string | null;
  next_service_km: number | null;
  created_at: string;
  updated_at: string;
  customer?: Customer;
}

export interface Job {
  id: string;
  vehicle_id: string;
  complaint: string;
  km_reading: number;
  job_date: string;
  assigned_mechanic: string;
  status: 'received' | 'in_progress' | 'ready' | 'completed';
  internal_notes: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobPart {
  id: string;
  job_id: string;
  part_name: string;
  part_number: string;
  quantity: number;
  unit_price: number;
  gst_percent: number;
}

export interface JobLabour {
  id: string;
  job_id: string;
  description: string;
  hours: number;
  rate: number;
  fixed_amount: number;
}

export interface Invoice {
  id: string;
  job_id: string;
  invoice_number: string;
  subtotal: number;
  discount: number;
  gst_total: number;
  grand_total: number;
  payment_status: 'unpaid' | 'partial' | 'paid';
  payment_mode: '' | 'cash' | 'upi' | 'card';
  signed_link_token: string;
  created_at: string;
}

export interface WorkshopSettings {
  id: string;
  workshop_name: string;
  logo_url: string;
  address: string;
  phone: string;
  gstin: string;
  invoice_prefix: string;
}

export interface PartCatalogueItem {
  id: string;
  part_name: string;
  part_number: string;
  default_price: number;
  default_gst: number;
  vehicle_make: string;
}

export interface PublicCarHistory {
  found: boolean;
  vehicle?: {
    make: string;
    model: string;
    year: number | null;
    number_plate: string;
    colour: string;
    fuel_type: string;
  };
  jobs?: Array<{
    job_date: string;
    km_reading: number;
    complaint: string;
    parts: Array<{ part_name: string; part_number: string }>;
    photos: Array<{ photo_url: string; photo_type: string }>;
  }>;
  next_service_date?: string | null;
  next_service_km?: number | null;
  workshop?: {
    workshop_name: string;
    logo_url: string;
    phone: string;
    address: string;
  };
}
