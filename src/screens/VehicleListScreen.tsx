import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Car, Plus, ChevronRight, Trash2, X } from 'lucide-react';
import { supabase, type Vehicle } from '@/lib/supabase';
import { maskPlate } from '@/lib/constants';
import { getCached, setCached } from '@/lib/cache';

export default function VehicleListScreen() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => getCached('vehicles') ?? []);
  const [loading, setLoading] = useState(() => !getCached('vehicles'));
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadVehicles();
  }, []);

  async function loadVehicles() {
    if (!getCached('vehicles')) {
      setLoading(true);
    }
    const { data } = await supabase
      .from('vehicles')
      .select('*, customer:customers(*)')
      .order('created_at', { ascending: false });
    if (data) {
      const vList = data as Vehicle[];
      setVehicles(vList);
      setCached('vehicles', vList);
    }
    setLoading(false);
  }

  async function handleDelete(e: React.MouseEvent, v: Vehicle) {
    e.preventDefault();
    e.stopPropagation();
    const confirmed = window.confirm(
      `Delete ${v.make} ${v.model} (${v.number_plate})?\n\nThis will permanently remove the vehicle and its service records.`
    );
    if (!confirmed) return;

    const { error } = await supabase.from('vehicles').delete().eq('id', v.id);
    if (error) {
      alert('Failed to delete vehicle: ' + error.message);
    } else {
      setVehicles((prev) => {
        const next = prev.filter((item) => item.id !== v.id);
        setCached('vehicles', next);
        return next;
      });
    }
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
            className="input-field pl-12 pr-10"
            placeholder="Search plate, name, phone, make…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-graphite-400 hover:text-graphite-600 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
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
              className="card flex items-center gap-3 transition-all hover:border-accent-300 group"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-graphite-100 dark:bg-graphite-800">
                <Car className="h-6 w-6 text-graphite-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-graphite-900 dark:text-white truncate">
                  {v.make} {v.model} <span className="text-graphite-400 font-normal">· {v.year}</span>
                </p>
                <p className="text-xs text-graphite-500 truncate">
                  {maskPlate(v.number_plate)} · {v.customer?.name ?? 'Unknown'}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => handleDelete(e, v)}
                className="p-2 text-graphite-400 hover:text-signal-red hover:bg-signal-red/10 rounded-xl transition-colors"
                title="Delete vehicle"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <ChevronRight className="h-5 w-5 text-graphite-300" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
