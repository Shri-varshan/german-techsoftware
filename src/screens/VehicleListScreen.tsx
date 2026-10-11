import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Car, Plus, ChevronRight } from 'lucide-react';
import { supabase, type Vehicle } from '@/lib/supabase';
import { maskPlate } from '@/lib/constants';

export default function VehicleListScreen() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadVehicles();
  }, []);

  async function loadVehicles() {
    setLoading(true);
    const { data } = await supabase
      .from('vehicles')
      .select('*, customer:customers(*)')
      .order('created_at', { ascending: false });
    setVehicles(data as Vehicle[] ?? []);
    setLoading(false);
  }

  const filtered = vehicles.filter((v) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      v.number_plate.toLowerCase().includes(q) ||
      v.make.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q) ||
      (v.customer?.name?.toLowerCase().includes(q) ?? false) ||
      (v.customer?.phone?.includes(q) ?? false)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-graphite-400" />
          <input
            className="input-field pl-12"
            placeholder="Search plate, name, phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Link to="/app/register" className="btn-primary ml-3">
          <Plus className="h-4 w-4" /> Register
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-graphite-100 dark:bg-graphite-800" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center py-12 text-center">
          <Car className="h-10 w-10 text-graphite-300" />
          <p className="mt-3 text-sm text-graphite-500">
            {search ? 'No vehicles match your search' : 'No vehicles registered yet'}
          </p>
          {!search && (
            <Link to="/app/register" className="btn-primary mt-4">
              <Plus className="h-4 w-4" /> Register first car
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((v) => (
            <Link
              key={v.id}
              to={`/app/vehicles/${v.id}`}
              className="card flex items-center gap-3 transition-all hover:border-accent-300"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-graphite-100 dark:bg-graphite-800">
                <Car className="h-6 w-6 text-graphite-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-graphite-900 dark:text-white">
                  {v.make} {v.model} <span className="text-graphite-400 font-normal">· {v.year}</span>
                </p>
                <p className="text-xs text-graphite-500">
                  {maskPlate(v.number_plate)} · {v.customer?.name ?? 'Unknown'}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-graphite-300" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
