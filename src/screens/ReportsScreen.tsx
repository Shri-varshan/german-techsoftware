import { useEffect, useState } from 'react';
import { IndianRupee, FileText, Package, Wrench, CheckCircle } from 'lucide-react';
import { supabase, type Invoice } from '@/lib/supabase';
import { formatINR, formatDate } from '@/lib/constants';

interface ReportData {
  totalBilled: number;
  invoiceCount: number;
  completedJobsCount: number;
  topServices: { complaint: string; count: number }[];
  topParts: { part_name: string; total_qty: number }[];
  recentInvoices: Invoice[];
}

export default function ReportsScreen() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadReports(); }, []);

  async function loadReports() {
    setLoading(true);
    const [invoicesRes, partsRes, jobsRes] = await Promise.all([
      supabase.from('invoices').select('*').order('created_at', { ascending: false }),
      supabase.from('job_parts').select('part_name, quantity'),
      supabase.from('jobs').select('complaint').eq('status', 'completed'),
    ]);

    const invoices = invoicesRes.data as Invoice[] ?? [];
    const totalBilled = invoices.reduce((s, i) => s + i.grand_total, 0);

    // Top services by complaint
    const complaintCounts: Record<string, number> = {};
    (jobsRes.data ?? []).forEach((j: { complaint: string }) => {
      complaintCounts[j.complaint] = (complaintCounts[j.complaint] ?? 0) + 1;
    });
    const topServices = Object.entries(complaintCounts)
      .map(([complaint, count]) => ({ complaint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Top parts used
    const partCounts: Record<string, number> = {};
    (partsRes.data ?? []).forEach((p: { part_name: string; quantity: number }) => {
      partCounts[p.part_name] = (partCounts[p.part_name] ?? 0) + p.quantity;
    });
    const topParts = Object.entries(partCounts)
      .map(([part_name, total_qty]) => ({ part_name, total_qty }))
      .sort((a, b) => b.total_qty - a.total_qty)
      .slice(0, 5);

    setData({
      totalBilled,
      invoiceCount: invoices.length,
      completedJobsCount: (jobsRes.data ?? []).length,
      topServices,
      topParts,
      recentInvoices: invoices.slice(0, 5),
    });
    setLoading(false);
  }

  if (loading) {
    return <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-graphite-100 dark:bg-graphite-800" />)}
      </div>
    </div>;
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ReportCard icon={IndianRupee} label="Total Billed" value={formatINR(data.totalBilled)} color="green" />
        <ReportCard icon={FileText} label="Total Invoices" value={String(data.invoiceCount)} color="accent" />
        <ReportCard icon={CheckCircle} label="Completed Services" value={String(data.completedJobsCount)} color="green" />
      </div>

      {/* Top services */}
      <div className="card">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-graphite-500">
          <Wrench className="h-4 w-4" /> Top Services
        </h3>
        {data.topServices.length === 0 ? (
          <p className="text-sm text-graphite-400 py-4 text-center">No completed jobs yet</p>
        ) : (
          <div className="space-y-2">
            {data.topServices.map((s, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-graphite-100 text-xs font-bold text-graphite-500 dark:bg-graphite-800">{i + 1}</span>
                  <p className="text-sm text-graphite-900 dark:text-white">{s.complaint}</p>
                </div>
                <span className="pill bg-graphite-100 text-graphite-600 dark:bg-graphite-800 dark:text-graphite-300">{s.count}×</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top parts */}
      <div className="card">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-graphite-500">
          <Package className="h-4 w-4" /> Most Used Parts
        </h3>
        {data.topParts.length === 0 ? (
          <p className="text-sm text-graphite-400 py-4 text-center">No parts used yet</p>
        ) : (
          <div className="space-y-2">
            {data.topParts.map((p, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-graphite-100 text-xs font-bold text-graphite-500 dark:bg-graphite-800">{i + 1}</span>
                  <p className="text-sm text-graphite-900 dark:text-white">{p.part_name}</p>
                </div>
                <span className="pill bg-graphite-100 text-graphite-600 dark:bg-graphite-800 dark:text-graphite-300">{p.total_qty} units</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent invoices */}
      <div className="card">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-graphite-500">Recent Invoices</h3>
        {data.recentInvoices.length === 0 ? (
          <p className="text-sm text-graphite-400 py-4 text-center">No invoices yet</p>
        ) : (
          <div className="space-y-2">
            {data.recentInvoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between rounded-xl border border-graphite-100 p-3 dark:border-graphite-800">
                <div>
                  <p className="text-sm font-semibold text-graphite-900 dark:text-white">{inv.invoice_number}</p>
                  <p className="text-xs text-graphite-500">{formatDate(inv.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold tabular-nums text-graphite-900 dark:text-white">{formatINR(inv.grand_total)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReportCard({ icon: Icon, label, value, color }: { icon: typeof IndianRupee; label: string; value: string; color: 'green' | 'accent' }) {
  const colors = {
    green: 'bg-signal-green/10 text-signal-green',
    accent: 'bg-accent-500/10 text-accent-600 dark:text-accent-400',
  };
  return (
    <div className="card flex items-center gap-4">
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${colors[color]}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-xl font-bold tabular-nums text-graphite-900 dark:text-white">{value}</p>
        <p className="text-xs text-graphite-500">{label}</p>
      </div>
    </div>
  );
}
