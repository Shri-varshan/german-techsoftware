import { supabase, type Vehicle, type Job, type Invoice, type Customer, type PartCatalogueItem } from './supabase';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();

export function getCached<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  return entry.data as T;
}

export function setCached<T>(key: string, data: T): void {
  memoryCache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

export function invalidateCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    memoryCache.clear();
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key.startsWith(keyPrefix)) {
      memoryCache.delete(key);
    }
  }
}

let isPrefetching = false;

/**
 * Pre-fetches key workshop datasets in the background.
 * Ensures that switching between Vehicles, Jobs, Invoices, and Dashboard is instantaneous (0ms).
 */
export async function prefetchCommonData(): Promise<void> {
  if (isPrefetching) return;
  isPrefetching = true;

  try {
    // Run background requests in parallel without blocking UI
    const [vehiclesRes, jobsRes, invoicesRes, customersRes] = await Promise.allSettled([
      supabase.from('vehicles').select('*, customer:customers(*)').order('created_at', { ascending: false }),
      supabase.from('jobs').select('*, vehicle:vehicles(*, customer:customers(*))').order('created_at', { ascending: false }),
      supabase.from('invoices').select('*, job:jobs(*, vehicle:vehicles(*, customer:customers(*)))').order('created_at', { ascending: false }),
      supabase.from('customers').select('*, vehicles(id, make, model, number_plate)').order('name'),
    ]);

    if (vehiclesRes.status === 'fulfilled' && vehiclesRes.value.data) {
      setCached('vehicles', vehiclesRes.value.data);
      setCached('dashboard_vehicles', vehiclesRes.value.data.slice(0, 5));
      setCached('dashboard_totalVehicles', vehiclesRes.value.data.length);
    }

    if (jobsRes.status === 'fulfilled' && jobsRes.value.data) {
      setCached('jobs', jobsRes.value.data);
      const active = (jobsRes.value.data as Job[]).filter((j) => ['received', 'in_progress', 'ready'].includes(j.status));
      setCached('dashboard_jobs', active);
    }

    if (invoicesRes.status === 'fulfilled' && invoicesRes.value.data) {
      setCached('invoices', invoicesRes.value.data);
      setCached('dashboard_totalInvoices', invoicesRes.value.data.length);
    }

    if (customersRes.status === 'fulfilled' && customersRes.value.data) {
      setCached('customers', customersRes.value.data);
    }
  } catch (err) {
    console.debug('Background prefetch skipped', err);
  } finally {
    isPrefetching = false;
  }
}
