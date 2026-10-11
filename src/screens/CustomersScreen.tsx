import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users, Phone, Mail, Car, ChevronRight } from 'lucide-react';
import { supabase, type Customer } from '@/lib/supabase';

interface CustomerWithVehicles extends Customer {
  vehicles?: { id: string; make: string; model: string; number_plate: string }[];
}

export default function CustomersScreen() {
  const [customers, setCustomers] = useState<CustomerWithVehicles[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { loadCustomers(); }, []);

  async function loadCustomers() {
    setLoading(true);
    const { data } = await supabase
      .from('customers')
      .select('*, vehicles(id, make, model, number_plate)')
      .order('name');
    setCustomers(data as CustomerWithVehicles[] ?? []);
    setLoading(false);
  }

  const filtered = customers.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.email?.toLowerCase().includes(q) ?? false);
  });

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-graphite-400" />
        <input className="input-field pl-12" placeholder="Search by name, phone, email…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-graphite-100 dark:bg-graphite-800" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center py-12 text-center">
          <Users className="h-10 w-10 text-graphite-300" />
          <p className="mt-3 text-sm text-graphite-500">{search ? 'No customers match your search' : 'No customers yet'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <div key={c.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-bold text-graphite-900 dark:text-white">{c.name}</p>
                  <div className="mt-1 space-y-0.5">
                    <p className="flex items-center gap-1.5 text-xs text-graphite-500"><Phone className="h-3 w-3" /> {c.phone}</p>
                    {c.email && <p className="flex items-center gap-1.5 text-xs text-graphite-500"><Mail className="h-3 w-3" /> {c.email}</p>}
                  </div>
                </div>
                <span className="pill bg-accent-500/10 text-accent-600 dark:text-accent-400">{c.vehicles?.length ?? 0} car{(c.vehicles?.length ?? 0) !== 1 ? 's' : ''}</span>
              </div>
              {c.vehicles && c.vehicles.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.vehicles.map((v) => (
                    <Link key={v.id} to={`/app/vehicles/${v.id}`} className="flex items-center gap-1.5 rounded-lg bg-graphite-50 px-2.5 py-1.5 text-xs font-medium text-graphite-600 transition-colors hover:bg-graphite-100 dark:bg-graphite-800 dark:text-graphite-300">
                      <Car className="h-3 w-3" /> {v.make} {v.model}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
