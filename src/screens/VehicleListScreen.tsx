import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Car, Plus, ChevronRight, Trash2, X, Archive } from 'lucide-react';
import { supabase, type Vehicle, deleteVehicleCascading, isVehicleScrapped } from '@/lib/supabase';
import { maskPlate } from '@/lib/constants';
import { getCached, setCached, invalidateCache } from '@/lib/cache';

export default function VehicleListScreen() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => getCached('vehicles') ?? []);
  const [loading, setLoading] = useState(() => !getCached('vehicles'));
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'active' | 'scrapped' | 'all'>('active');

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
      `Delete ${v.make} ${v.model} (${v.number_plate})?\n\nThis will permanently remove the vehicle and all of its job cards, invoices, parts, and photos.`
    );
    if (!confirmed) return;

    const { error } = await deleteVehicleCascading(v.id);
    if (error) {
      alert('Failed to delete vehicle: ' + error.message);
    } else {
      setVehicles((prev) => {
        const next = prev.filter((item) => item.id !== v.id);
        setCached('vehicles', next);
        return next;
      });
      invalidateCache('vehicles');
      invalidateCache('jobs');
      invalidateCache('invoices');
      invalidateCache('dashboard');
      invalidateCache('reports');
      invalidateCache('customers');
      invalidateCache(`vehicle_${v.id}`);
      invalidateCache(`vehicle_jobs_${v.id}`);
    }
  }

  const activeVehicles = vehicles.filter((v) => !isVehicleScrapped(v));
  const scrappedVehicles = vehicles.filter((v) => isVehicleScrapped(v));

  const filtered = vehicles.filter((v) => {
    const isScrapped = isVehicleScrapped(v);
    const q = search.trim().toLowerCase();

    if (q) {
      const matchesSearch = (
        v.number_plate.toLowerCase().includes(q) ||
        v.make.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        (v.customer?.name?.toLowerCase().includes(q) ?? false) ||
        (v.customer?.phone?.includes(q) ?? false)
      );
      if (!matchesSearch) return false;
      if (tab === 'active') return !isScrapped;
      if (tab === 'scrapped') return isScrapped;
      return true;
    }

    if (tab === 'active') return !isScrapped;
    if (tab === 'scrapped') return isScrapped;
    return true;
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

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-graphite-200 dark:border-graphite-800 pb-2">
        <button
          type="button"
          onClick={() => setTab('active')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            tab === 'active'
              ? 'bg-accent-500 text-white shadow-sm'
              : 'text-graphite-600 dark:text-graphite-400 hover:bg-graphite-100 dark:hover:bg-graphite-800'
          }`}
        >
          Active Cars ({activeVehicles.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('scrapped')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            tab === 'scrapped'
              ? 'bg-signal-amber text-white shadow-sm'
              : 'text-graphite-600 dark:text-graphite-400 hover:bg-graphite-100 dark:hover:bg-graphite-800'
          }`}
        >
          <Archive className="h-3.5 w-3.5" /> Scrapped ({scrappedVehicles.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            tab === 'all'
              ? 'bg-graphite-900 text-white dark:bg-white dark:text-graphite-900 shadow-sm'
              : 'text-graphite-600 dark:text-graphite-400 hover:bg-graphite-100 dark:hover:bg-graphite-800'
          }`}
        >
          All ({vehicles.length})
        </button>
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
            {search ? 'No vehicles match your search' : tab === 'scrapped' ? 'No scrapped vehicles' : 'No vehicles registered yet'}
          </p>
          {!search && tab === 'active' && (
            <Link to="/app/register" className="btn-primary mt-4">
              <Plus className="h-4 w-4" /> Register first car
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((v) => {
            const isScrap = isVehicleScrapped(v);
            return (
              <Link
                key={v.id}
                to={`/app/vehicles/${v.id}`}
                className={`card flex items-center gap-3 transition-all hover:border-accent-300 group ${
                  isScrap ? 'opacity-85 border-graphite-200 dark:border-graphite-800 bg-graphite-50/50 dark:bg-graphite-900/50' : ''
                }`}
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                  isScrap ? 'bg-signal-amber/10 text-signal-amber' : 'bg-graphite-100 dark:bg-graphite-800 text-graphite-400'
                }`}>
                  {isScrap ? <Archive className="h-6 w-6" /> : <Car className="h-6 w-6" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-graphite-900 dark:text-white truncate">
                      {v.make} {v.model} <span className="text-graphite-400 font-normal">· {v.year}</span>
                    </p>
                    {isScrap && (
                      <span className="rounded bg-signal-amber/15 px-2 py-0.5 text-2xs font-bold text-signal-amber border border-signal-amber/30">
                        Scrapped
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-graphite-500 truncate">
                    {maskPlate(v.number_plate)} · {v.customer?.name ?? 'Unknown'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleDelete(e, v)}
                  className="p-2 text-graphite-400 hover:text-signal-red hover:bg-signal-red/10 rounded-xl transition-colors"
                  title="Delete vehicle permanently"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <ChevronRight className="h-5 w-5 text-graphite-300" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
