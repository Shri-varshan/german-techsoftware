import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Printer, AlertCircle } from 'lucide-react';
import { supabase, type Invoice, type Job, type Vehicle, type JobPart, type JobLabour, type WorkshopSettings } from '@/lib/supabase';
import { formatINR, formatDate, maskPlate } from '@/lib/constants';

interface FullInvoice extends Invoice {
  job?: Job & { vehicle?: Vehicle & { customer?: { name: string; phone: string; address: string; email: string } } };
}

export default function PublicInvoicePage() {
  const { token } = useParams<{ token: string }>();
  const [invoice, setInvoice] = useState<FullInvoice | null>(null);
  const [parts, setParts] = useState<JobPart[]>([]);
  const [labour, setLabour] = useState<JobLabour[]>([]);
  const [settings, setSettings] = useState<WorkshopSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    loadInvoiceData(token);
  }, [token]);

  async function loadInvoiceData(token: string) {
    setLoading(true);

    // Try RPC first in case the migration was applied
    const { data: rpcData, error: rpcError } = await supabase.rpc('public_invoice', { p_token: token });
    
    if (!rpcError && rpcData && (rpcData as any).found) {
       const data = rpcData as any;
       // Mop RPC data to match component structure
       setInvoice(data.invoice as FullInvoice);
       setParts(data.parts || []);
       setLabour(data.labour || []);
       setSettings(data.workshop || null);
       setLoading(false);
       return;
    }

    // Fallback to direct query if RPC doesn't exist
    const { data: inv } = await supabase
      .from('invoices')
      .select('*, job:jobs(*, vehicle:vehicles(*, customer:customers(*)))')
      .eq('signed_link_token', token)
      .maybeSingle();

    if (inv) {
      setInvoice(inv as FullInvoice);
      const [partsRes, labourRes, settingsRes] = await Promise.all([
        supabase.from('job_parts').select('*').eq('job_id', (inv as FullInvoice).job_id),
        supabase.from('job_labour').select('*').eq('job_id', (inv as FullInvoice).job_id),
        supabase.from('workshop_settings').select('*').maybeSingle(),
      ]);
      setParts(partsRes.data as JobPart[] ?? []);
      setLabour(labourRes.data as JobLabour[] ?? []);
      setSettings(settingsRes.data as WorkshopSettings | null);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-graphite-50 dark:bg-graphite-950 p-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-graphite-200 border-t-accent-500" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-graphite-50 dark:bg-graphite-950 p-4">
        <div className="card max-w-sm text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-graphite-300" />
          <h2 className="mt-4 text-lg font-bold text-graphite-900 dark:text-white">Invoice Not Found</h2>
          <p className="mt-2 text-sm text-graphite-500">The invoice link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  // Handle both RPC data format and direct query format
  const workshopName = settings?.workshop_name || 'German Tech';
  const workshopAddress = settings?.address || '';
  const workshopPhone = settings?.phone || '';
  const gstin = settings?.gstin || '';
  
  const isRpc = !invoice.job;
  const customer = isRpc ? (invoice as any).customer : invoice.job?.vehicle?.customer;
  const vehicle = isRpc ? (invoice as any).vehicle : invoice.job?.vehicle;
  const kmReading = isRpc ? vehicle?.km_reading : invoice.job?.km_reading;

  return (
    <div className="min-h-screen bg-graphite-50 py-8 dark:bg-graphite-950 print:bg-white print:py-0">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        
        <div className="no-print mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-graphite-900 dark:text-white">Your Invoice</h1>
            <p className="text-sm text-graphite-500">Thank you for choosing {workshopName}</p>
          </div>
          <button onClick={() => window.print()} className="btn-primary">
            <Printer className="h-4 w-4" /> Download / Print
          </button>
        </div>

        <div className="rounded-2xl border border-graphite-200 bg-white p-6 shadow-sm dark:border-graphite-800 dark:bg-graphite-900 lg:p-8 print:border-none print:shadow-none">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-graphite-200 pb-5 dark:border-graphite-700">
            <div>
              <h2 className="text-xl font-bold text-graphite-900 dark:text-white">{workshopName}</h2>
              <p className="mt-1 text-xs text-graphite-500 max-w-xs">{workshopAddress}</p>
              <p className="mt-1 text-xs text-graphite-500">{workshopPhone}</p>
            </div>
            <div className="text-right">
              <h2 className="text-lg font-bold text-graphite-900 dark:text-white">INVOICE</h2>
              <p className="mt-1 text-sm font-semibold text-graphite-900 dark:text-white">{invoice.invoice_number}</p>
              <p className="text-xs text-graphite-500">{formatDate(invoice.created_at)}</p>
            </div>
          </div>

          {/* Customer + vehicle info */}
          <div className="grid grid-cols-2 gap-4 py-5">
            <div>
              <p className="text-2xs font-semibold uppercase tracking-wide text-graphite-400">Bill to</p>
              <p className="mt-1 text-sm font-bold text-graphite-900 dark:text-white">{customer?.name || '-'}</p>
              <p className="text-xs text-graphite-500">{customer?.phone || ''}</p>
              <p className="text-xs text-graphite-500">{customer?.address || ''}</p>
            </div>
            <div className="text-right">
              <p className="text-2xs font-semibold uppercase tracking-wide text-graphite-400">Vehicle</p>
              <p className="mt-1 text-sm font-bold text-graphite-900 dark:text-white">{vehicle?.make} {vehicle?.model}</p>
              <p className="text-xs text-graphite-500">{maskPlate(vehicle?.number_plate ?? '')}</p>
              <p className="text-xs text-graphite-500">{kmReading?.toLocaleString('en-IN')} km</p>
            </div>
          </div>

          {/* Line items */}
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-y border-graphite-200 dark:border-graphite-700">
                <th className="py-2 text-left text-2xs font-semibold uppercase tracking-wide text-graphite-400">Description</th>
                <th className="py-2 text-right text-2xs font-semibold uppercase tracking-wide text-graphite-400">Qty</th>
                <th className="py-2 text-right text-2xs font-semibold uppercase tracking-wide text-graphite-400">Rate</th>
                <th className="py-2 text-right text-2xs font-semibold uppercase tracking-wide text-graphite-400">Amount</th>
              </tr>
            </thead>
            <tbody>
              {parts.map((p, idx) => (
                <tr key={idx} className="border-b border-graphite-100 dark:border-graphite-800">
                  <td className="py-2.5 text-sm text-graphite-900 dark:text-white">{p.part_name}</td>
                  <td className="py-2.5 text-right text-sm tabular-nums text-graphite-700 dark:text-graphite-300">{p.quantity}</td>
                  <td className="py-2.5 text-right text-sm tabular-nums text-graphite-700 dark:text-graphite-300">{formatINR(p.unit_price)}</td>
                  <td className="py-2.5 text-right text-sm font-semibold tabular-nums text-graphite-900 dark:text-white">{formatINR(p.quantity * p.unit_price)}</td>
                </tr>
              ))}
              {labour.map((l, idx) => (
                <tr key={idx} className="border-b border-graphite-100 dark:border-graphite-800">
                  <td className="py-2.5 text-sm text-graphite-900 dark:text-white">{l.description}</td>
                  <td className="py-2.5 text-right text-sm tabular-nums text-graphite-700 dark:text-graphite-300">{l.hours > 0 ? l.hours : '-'}</td>
                  <td className="py-2.5 text-right text-sm tabular-nums text-graphite-700 dark:text-graphite-300">{l.hours > 0 ? formatINR(l.rate) : '-'}</td>
                  <td className="py-2.5 text-right text-sm font-semibold tabular-nums text-graphite-900 dark:text-white">{formatINR(l.fixed_amount > 0 ? l.fixed_amount : l.hours * l.rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="mt-5 flex justify-end">
            <div className="w-full max-w-xs space-y-2">
              <div className="flex justify-between text-sm text-graphite-500">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatINR(invoice.subtotal)}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between text-sm text-graphite-500">
                  <span>Discount</span>
                  <span className="tabular-nums">-{formatINR(invoice.discount)}</span>
                </div>
              )}
              <div className="border-t border-graphite-200 pt-2 flex justify-between text-base font-bold text-graphite-900 dark:text-white dark:border-graphite-700">
                <span>Grand Total</span>
                <span className="tabular-nums">{formatINR(invoice.grand_total)}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-graphite-200 dark:border-graphite-700">
            <p className="text-center text-xs text-graphite-500">
              This is a computer-generated invoice and does not require a signature.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
