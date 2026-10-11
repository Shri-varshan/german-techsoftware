import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Wrench, ChevronRight } from 'lucide-react';
import { supabase, type Job } from '@/lib/supabase';
import { formatDate, maskPlate } from '@/lib/constants';

interface JobWithVehicle extends Job {
  vehicle?: {
    id: string;
    make: string;
    model: string;
    number_plate: string;
    customer?: { name: string };
  };
}

export default function JobListScreen() {
  const [jobs, setJobs] = useState<JobWithVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadJobs();
  }, []);

  async function loadJobs() {
    setLoading(true);
    const { data } = await supabase
      .from('jobs')
      .select('*, vehicle:vehicles(*, customer:customers(*))')
      .order('created_at', { ascending: false });
    setJobs(data as JobWithVehicle[] ?? []);
    setLoading(false);
  }

  const filtered = jobs.filter((j) => {
    if (statusFilter !== 'all' && j.status !== statusFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      j.complaint.toLowerCase().includes(q) ||
      (j.vehicle?.number_plate?.toLowerCase().includes(q) ?? false) ||
      (j.vehicle?.make?.toLowerCase().includes(q) ?? false) ||
      (j.assigned_mechanic?.toLowerCase().includes(q) ?? false)
    );
  });

  const statusCounts = {
    received: jobs.filter((j) => j.status === 'received').length,
    in_progress: jobs.filter((j) => j.status === 'in_progress').length,
    ready: jobs.filter((j) => j.status === 'ready').length,
    completed: jobs.filter((j) => j.status === 'completed').length,
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-graphite-400" />
        <input className="input-field pl-12" placeholder="Search by plate, complaint, mechanic…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-graphite-100 dark:bg-graphite-800" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center py-12 text-center">
          <Wrench className="h-10 w-10 text-graphite-300" />
          <p className="mt-3 text-sm text-graphite-500">{search || statusFilter !== 'all' ? 'No jobs match your filter' : 'No jobs created yet'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((job) => (
            <Link key={job.id} to={`/app/jobs/${job.id}`} className="card flex items-center justify-between transition-all hover:border-accent-300">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm font-semibold text-graphite-900 dark:text-white">{job.complaint}</p>
                  <p className="text-xs text-graphite-500">
                    {job.vehicle?.make} {job.vehicle?.model} · {maskPlate(job.vehicle?.number_plate ?? '')} · {formatDate(job.job_date)}
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-graphite-300" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterTab({ label, count, active, onClick, color }: { label: string; count: number; active: boolean; onClick: () => void; color?: string }) {
  const colorClasses: Record<string, string> = {
    graphite: 'bg-graphite-100 text-graphite-600 dark:bg-graphite-800 dark:text-graphite-300',
    amber: 'bg-signal-amber/10 text-signal-amber',
    accent: 'bg-accent-500/10 text-accent-600 dark:text-accent-400',
    green: 'bg-signal-green/10 text-signal-green',
  };
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold whitespace-nowrap transition-all ${
        active ? 'bg-graphite-900 text-white dark:bg-white dark:text-graphite-900' : 'bg-graphite-100 text-graphite-500 dark:bg-graphite-800 dark:text-graphite-400'
      }`}
    >
      {label}
      <span className={`rounded-full px-1.5 py-0.5 text-2xs ${active ? 'bg-white/20' : colorClasses[color ?? ''] ?? 'bg-graphite-200'}`}>{count}</span>
    </button>
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
