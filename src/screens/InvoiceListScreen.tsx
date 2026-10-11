import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, FileText, ChevronRight, IndianRupee, Hash } from 'lucide-react';
import { supabase, type Invoice } from '@/lib/supabase';
import { formatINR, formatDate } from '@/lib/constants';

interface InvoiceWithJob extends Invoice {
  job?: {
    vehicle?: {
      make: string;
      model: string;
      number_plate: string;
      customer?: { name: string };
    };
  };
}

export default function InvoiceListScreen() {
  const [invoices, setInvoices] = useState<InvoiceWithJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadInvoices();
  }, []);

  async function loadInvoices() {
    setLoading(true);
    const { data } = await supabase
      .from('invoices')
      .select('*, job:jobs(*, vehicle:vehicles(*, customer:customers(*)))')
      .order('created_at', { ascending: false });
    setInvoices(data as InvoiceWithJob[] ?? []);
    setLoading(false);
  }

  const filtered = invoices.filter((inv) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      inv.invoice_number.toLowerCase().includes(q) ||
      (inv.job?.vehicle?.number_plate?.toLowerCase().includes(q) ?? false) ||
      (inv.job?.vehicle?.customer?.name?.toLowerCase().includes(q) ?? false)
    );
  });

  const totalBilled = invoices.reduce((sum, i) => sum + i.grand_total, 0);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-500/10">
            <Hash className="h-5 w-5 text-accent-600 dark:text-accent-400" />
          </div>
          <div>
            <p className="text-lg font-bold tabular-nums text-graphite-900 dark:text-white">{invoices.length}</p>
            <p className="text-2xs text-graphite-500">Total Invoices</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-signal-green/10">
            <IndianRupee className="h-5 w-5 text-signal-green" />
          </div>
          <div>
            <p className="text-lg font-bold tabular-nums text-graphite-900 dark:text-white">{formatINR(totalBilled)}</p>
            <p className="text-2xs text-graphite-500">Total Billed</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-graphite-400" />
        <input
          className="input-field pl-12"
          placeholder="Search invoice number, plate, customer…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-graphite-100 dark:bg-graphite-800" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center py-12 text-center">
          <FileText className="h-10 w-10 text-graphite-300" />
          <p className="mt-3 text-sm text-graphite-500">{search ? 'No invoices match your search' : 'No invoices yet'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((inv) => (
            <Link key={inv.id} to={`/app/invoices/${inv.id}`} className="card flex items-center justify-between transition-all hover:border-accent-300">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-500/10 text-accent-600 dark:text-accent-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-graphite-900 dark:text-white">{inv.invoice_number}</p>
                  <p className="text-xs text-graphite-500">
                    {inv.job?.vehicle?.make} {inv.job?.vehicle?.model} · {inv.job?.vehicle?.customer?.name} · {formatDate(inv.created_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm font-bold tabular-nums text-graphite-900 dark:text-white">{formatINR(inv.grand_total)}</p>
                <ChevronRight className="h-5 w-5 text-graphite-300" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
