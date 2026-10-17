import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Car, Wrench, FileText, Clock, Plus, Search, TrendingUp, IndianRupee, ShieldCheck } from 'lucide-react';
import { supabase, type Vehicle, type Job, type Invoice } from '@/lib/supabase';
import { formatINR, formatDate, maskPlate } from '@/lib/constants';
import { getCached, setCached } from '@/lib/cache';

interface JobWithVehicle extends Job {
  vehicle?: { make: string; model: string; number_plate: string; customer?: { name: string } };
}

export default function DashboardScreen() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => getCached('dashboard_vehicles') ?? []);
  const [activeJobs, setActiveJobs] = useState<JobWithVehicle[]>(() => getCached('dashboard_jobs') ?? []);
  const [totalVehiclesCount, setTotalVehiclesCount] = useState<number>(() => getCached('dashboard_totalVehicles') ?? 0);
  const [totalInvoicesCount, setTotalInvoicesCount] = useState<number>(() => getCached('dashboard_totalInvoices') ?? 0);
  const [todayCount, setTodayCount] = useState<number>(() => getCached('dashboard_todayCount') ?? 0);
  const [loading, setLoading] = useState(() => !getCached('dashboard_vehicles'));
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    if (!getCached('dashboard_vehicles')) {
      setLoading(true);
    }
    const [vehiclesRes, jobsRes, totalVehiclesRes, totalInvoicesRes, todayRes] = await Promise.all([
      supabase.from('vehicles').select('*, customer:customers(*)').neq('colour', 'scrapped').order('created_at', { ascending: false }).limit(5),
      supabase.from('jobs').select('*, vehicle:vehicles(*, customer:customers(*))').in('status', ['received', 'in_progress', 'ready']).order('created_at', { ascending: false }),
      supabase.from('vehicles').select('id', { count: 'exact', head: true }).neq('colour', 'scrapped'),
      supabase.from('invoices').select('id', { count: 'exact', head: true }),
      supabase.from('jobs').select('id').gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    ]);

    const vData = (vehiclesRes.data as Vehicle[]) ?? [];
    const jData = (jobsRes.data as JobWithVehicle[]) ?? [];
    const vCount = totalVehiclesRes.count ?? 0;
    const iCount = totalInvoicesRes.count ?? 0;
    const tCount = todayRes.data?.length ?? 0;

    setVehicles(vData);
    setActiveJobs(jData);
    setTotalVehiclesCount(vCount);
    setTotalInvoicesCount(iCount);
    setTodayCount(tCount);

    setCached('dashboard_vehicles', vData);
    setCached('dashboard_jobs', jData);
    setCached('dashboard_totalVehicles', vCount);
    setCached('dashboard_totalInvoices', iCount);
    setCached('dashboard_todayCount', tCount);

    setLoading(false);
  }

  return (
    <div className="space-y-6">
      {/* Admin Executive Analytics Shortcut */}
      <Link 
        to="/app/admin" 
        className="rounded-2xl border border-accent-500/30 bg-gradient-to-r from-accent-500/10 via-accent-500/5 to-transparent p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-accent-500 transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-500 text-white shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-graphite-900 dark:text-white flex flex-wrap items-center gap-2">
              Admin Executive Dashboard
              <span className="rounded bg-accent-500/15 px-2 py-0.5 text-2xs font-extrabold text-accent-600 dark:text-accent-400 uppercase">
                Daily · Weekly (Sun-Sat) · Monthly
              </span>
            </h3>
            <p className="text-xs text-graphite-500 mt-0.5">
              View registered vehicles, job cards throughput, and billed invoices for any date range.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs font-bold text-accent-600 dark:text-accent-400 group-hover:translate-x-1 transition-transform self-end sm:self-auto">
          Open Analytics →
        </div>
      </Link>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Car} label="Today's cars" value={String(todayCount)} color="accent" />
        <StatCard icon={Wrench} label="Active jobs" value={String(activeJobs.length)} color="amber" />
        <StatCard icon={Car} label="Total registered" value={String(totalVehiclesCount)} color="accent" />
        <StatCard icon={FileText} label="Total invoices" value={String(totalInvoicesCount)} color="green" />
      </div>

      {/* Quick search */}
      <div className="card">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-graphite-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by plate, phone, or name…"
            className="input-field pl-12 text-base"
          />
        </div>
        {search.trim().length >= 2 && (
          <SearchResults query={search.trim()} />
        )}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link to="/app/register" className="btn-primary">
          <Plus className="h-4 w-4" /> Register new car
        </Link>
        <Link to="/app/vehicles" className="btn-secondary">
          <Car className="h-4 w-4" /> View all vehicles
        </Link>
      </div>

      {/* Active jobs */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-graphite-500">Active Jobs</h2>
          <Link to="/app/jobs" className="text-xs font-semibold text-accent-600 hover:underline dark:text-accent-400">
            View all
          </Link>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-graphite-100 dark:bg-graphite-800" />
            ))}
          </div>
        ) : activeJobs.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-10 text-center">
            <Wrench className="h-8 w-8 text-graphite-300" />
            <p className="mt-2 text-sm text-graphite-500">No active jobs right now</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeJobs.map((job) => (
              <Link
                key={job.id}
                to={`/app/jobs/${job.id}`}
                className="card flex items-center justify-between transition-all hover:border-accent-300"
              >
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-semibold text-graphite-900 dark:text-white">
                      {job.vehicle?.make} {job.vehicle?.model}
                    </p>
                    <p className="text-xs text-graphite-500">
                      {maskPlate(job.vehicle?.number_plate ?? '')} · {job.complaint}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-graphite-400">{formatDate(job.job_date)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent vehicles */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-graphite-500">Recently Registered</h2>
          <Link to="/app/vehicles" className="text-xs font-semibold text-accent-600 hover:underline dark:text-accent-400">
            View all
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-graphite-100 dark:bg-graphite-800" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((v) => (
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
                    {v.make} {v.model}
                  </p>
                  <p className="text-xs text-graphite-500">
                    {maskPlate(v.number_plate)} · {v.customer?.name ?? 'Unknown'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Car; label: string; value: string; color: 'accent' | 'amber' | 'red' | 'green' }) {
  const colors = {
    accent: 'bg-accent-500/10 text-accent-600 dark:text-accent-400',
    amber: 'bg-signal-amber/10 text-signal-amber',
    red: 'bg-signal-red/10 text-signal-red',
    green: 'bg-signal-green/10 text-signal-green',
  };
  return (
    <div className="card flex items-center gap-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-lg font-bold text-graphite-900 dark:text-white tabular-nums">{value}</p>
        <p className="text-2xs text-graphite-500">{label}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; class: string }> = {
    received: { label: 'Received', class: 'bg-graphite-100 text-graphite-600 dark:bg-graphite-800 dark:text-graphite-300' },
    in_progress: { label: 'In Progress', class: 'bg-signal-amber/10 text-signal-amber' },
    ready: { label: 'Ready', class: 'bg-accent-500/10 text-accent-600 dark:text-accent-400' },
    completed: { label: 'Completed', class: 'bg-signal-green/10 text-signal-green' },
  };
  const c = config[status] ?? config.received;
  return <span className={`pill ${c.class}`}>{c.label}</span>;
}

function SearchResults({ query }: { query: string }) {
  const [results, setResults] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('vehicles')
        .select('*, customer:customers(*)')
        .or(`number_plate.ilike.%${query}%,customer.phone.ilike.%${query}%`)
        .limit(5);
      if (!cancelled) {
        setResults(data as Vehicle[] ?? []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [query]);

  if (loading) return <div className="mt-3 text-sm text-graphite-400">Searching…</div>;
  if (results.length === 0) return <div className="mt-3 text-sm text-graphite-400">No matches found</div>;

  return (
    <div className="mt-3 space-y-1.5">
      {results.map((v) => (
        <Link
          key={v.id}
          to={`/app/vehicles/${v.id}`}
          className="flex items-center justify-between rounded-xl border border-graphite-100 px-3 py-2.5 transition-colors hover:bg-graphite-50 dark:border-graphite-800 dark:hover:bg-graphite-800"
        >
          <div>
            <p className="text-sm font-semibold text-graphite-900 dark:text-white">{v.make} {v.model}</p>
            <p className="text-xs text-graphite-500">{maskPlate(v.number_plate)} · {v.customer?.name}</p>
          </div>
          <TrendingUp className="h-4 w-4 text-graphite-300" />
        </Link>
      ))}
    </div>
  );
}
