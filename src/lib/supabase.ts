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
    customer_name?: string;
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

export async function deleteVehicleCascading(vehicleId: string): Promise<{ error: Error | null }> {
  try {
    // 1. Fetch all jobs belonging to this vehicle
    const { data: jobs, error: jobsErr } = await supabase
      .from('jobs')
      .select('id')
      .eq('vehicle_id', vehicleId);

    if (jobsErr) throw jobsErr;

    const jobIds = jobs?.map((j) => j.id) ?? [];

    if (jobIds.length > 0) {
      // 2. Fetch all invoices for these jobs
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id')
        .in('job_id', jobIds);

      const invoiceIds = invoices?.map((inv) => inv.id) ?? [];

      if (invoiceIds.length > 0) {
        // Delete payments
        await supabase.from('payments').delete().in('invoice_id', invoiceIds);
        // Delete invoices
        await supabase.from('invoices').delete().in('id', invoiceIds);
      }

      // Delete job parts, labour, photos
      await supabase.from('job_parts').delete().in('job_id', jobIds);
      await supabase.from('job_labour').delete().in('job_id', jobIds);
      await supabase.from('job_photos').delete().in('job_id', jobIds);

      // Delete jobs
      await supabase.from('jobs').delete().in('id', jobIds);
    }

    // 3. Delete the vehicle itself
    const { error: vehErr } = await supabase.from('vehicles').delete().eq('id', vehicleId);
    if (vehErr) throw vehErr;

    return { error: null };
  } catch (err: any) {
    console.error('Cascading vehicle delete failed:', err);
    return { error: err };
  }
}
