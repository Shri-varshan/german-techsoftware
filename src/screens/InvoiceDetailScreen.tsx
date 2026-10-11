import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileText, Printer, MessageCircle, Download, CheckCircle2, Lock } from 'lucide-react';
import { supabase, type Invoice, type Job, type Vehicle, type JobPart, type JobLabour, type WorkshopSettings } from '@/lib/supabase';
import { formatINR, formatDate, maskPlate } from '@/lib/constants';
import html2canvas from 'html2canvas';

interface FullInvoice extends Invoice {
  job?: Job & { vehicle?: Vehicle & { customer?: { name: string; phone: string; address: string; email: string } } };
}

export default function InvoiceDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<FullInvoice | null>(null);
  const [parts, setParts] = useState<JobPart[]>([]);
  const [labour, setLabour] = useState<JobLabour[]>([]);
  const [settings, setSettings] = useState<WorkshopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingPayment, setUpdatingPayment] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadInvoice(id);
    loadSettings();
  }, [id]);

  async function loadSettings() {
    const { data } = await supabase.from('workshop_settings').select('*').maybeSingle();
    setSettings(data as WorkshopSettings | null);
  }

  async function loadInvoice(invoiceId: string) {
    setLoading(true);
    const { data: inv } = await supabase
      .from('invoices')
      .select('*, job:jobs(*, vehicle:vehicles(*, customer:customers(*)))')
      .eq('id', invoiceId)
      .maybeSingle();
    if (inv) {
      setInvoice(inv as FullInvoice);
      const [partsRes, labourRes] = await Promise.all([
        supabase.from('job_parts').select('*').eq('job_id', (inv as FullInvoice).job_id),
        supabase.from('job_labour').select('*').eq('job_id', (inv as FullInvoice).job_id),
      ]);
      setParts(partsRes.data as JobPart[] ?? []);
      setLabour(labourRes.data as JobLabour[] ?? []);
    }
    setLoading(false);
  }

  async function updatePayment(status: Invoice['payment_status'], mode: Invoice['payment_mode']) {
    if (!invoice) return;
    setUpdatingPayment(true);
    await supabase.from('invoices').update({
      payment_status: status,
      payment_mode: mode,
    }).eq('id', invoice.id);
    setUpdatingPayment(false);
    loadInvoice(invoice.id);
  }

  async function sendWhatsApp() {
    if (!invoice?.job?.vehicle?.customer?.phone) return;
    try {
      const el = document.getElementById('invoice-container');
      if (!el) return;
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff' });
      
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `Invoice_${invoice.invoice_number}.png`, { type: 'image/png' });
        const text = `Hello ${invoice.job!.vehicle!.customer!.name},\n\nYour invoice ${invoice.invoice_number} from German Tech is ready.\nTotal: ${formatINR(invoice.grand_total)}\n\nThank you for choosing us!`;
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Invoice ${invoice.invoice_number}`,
            text: text,
          });
        } else {
          // fallback to text link if sharing files is not supported (e.g. desktop sometimes)
          const phone = invoice.job!.vehicle!.customer!.phone.replace(/\D/g, '');
          window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
        }
      }, 'image/png');
    } catch (e) {
      console.error('Share failed', e);
    }
  }

  if (loading) {
    return <div className="space-y-3">
      <div className="h-8 w-48 animate-pulse rounded bg-graphite-100 dark:bg-graphite-800" />
      <div className="h-96 animate-pulse rounded-2xl bg-graphite-100 dark:bg-graphite-800" />
    </div>;
  }

  if (!invoice) {
    return <div className="card text-center py-10">
      <p className="text-sm text-graphite-500">Invoice not found</p>
      <Link to="/app/invoices" className="btn-primary mt-4">Back to invoices</Link>
    </div>;
  }

  const workshopName = settings?.workshop_name || 'German Tech';
  const workshopAddress = settings?.address || '';
  const workshopPhone = settings?.phone || '';
  const gstin = settings?.gstin || '';
  const customer = invoice.job?.vehicle?.customer;
  const vehicle = invoice.job?.vehicle;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="no-print flex items-center justify-between">
        <Link to="/app/invoices" className="inline-flex items-center gap-1 text-sm text-graphite-500 hover:text-graphite-900 dark:hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to invoices
        </Link>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="btn-ghost text-xs"><Printer className="h-4 w-4" /> Print</button>
          <button onClick={sendWhatsApp} className="btn-secondary text-xs"><MessageCircle className="h-4 w-4" /> WhatsApp</button>
        </div>
      </div>

      {/* Invoice document */}
      <div id="invoice-container" className="rounded-2xl border border-graphite-200 bg-white p-6 shadow-sm dark:border-graphite-800 dark:bg-graphite-900 lg:p-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-graphite-200 pb-5 dark:border-graphite-700">
          <div className="flex items-start gap-3.5">
            <img src="/logo.png" alt="German Tech" className="h-14 w-14 rounded-xl object-contain bg-black p-1 shadow-sm" />
            <div>
              <h1 className="text-xl font-bold text-graphite-900 dark:text-white">{workshopName}</h1>
              <p className="mt-1 text-xs text-graphite-500 max-w-xs">{workshopAddress}</p>
              <p className="mt-1 text-xs text-graphite-500">{workshopPhone}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-2">
              <FileText className="h-5 w-5 text-accent-500" />
              <h2 className="text-lg font-bold text-graphite-900 dark:text-white">INVOICE</h2>
            </div>
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
            <p className="text-xs text-graphite-500">{invoice.job?.km_reading.toLocaleString('en-IN')} km</p>
          </div>
        </div>

        {/* Line items */}
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-y border-graphite-200 dark:border-graphite-700">
              <th className="py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-graphite-500">Description</th>
              <th className="py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-graphite-500">Amount</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((p) => (
              <tr key={p.id} className="border-b border-graphite-100 dark:border-graphite-800">
                <td className="py-3 text-sm text-graphite-900 dark:text-white">
                  {p.part_name} {p.quantity > 1 && <span className="text-xs text-graphite-400 font-medium">(Qty: {p.quantity})</span>}
                </td>
                <td className="py-3 text-right text-sm font-semibold tabular-nums text-graphite-900 dark:text-white">{formatINR(p.quantity * p.unit_price)}</td>
              </tr>
            ))}
            {labour.map((l) => (
              <tr key={l.id} className="border-b border-graphite-100 dark:border-graphite-800">
                <td className="py-3 text-sm text-graphite-900 dark:text-white">{l.description}</td>
                <td className="py-3 text-right text-sm font-semibold tabular-nums text-graphite-900 dark:text-white">{formatINR(l.fixed_amount > 0 ? l.fixed_amount : l.hours * l.rate)}</td>
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
      </div>
    </div>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; class: string }> = {
    unpaid: { label: 'Unpaid', class: 'bg-signal-red/10 text-signal-red' },
    partial: { label: 'Partial', class: 'bg-signal-amber/10 text-signal-amber' },
    paid: { label: 'Paid', class: 'bg-signal-green/10 text-signal-green' },
  };
  const c = config[status] ?? config.unpaid;
  return <span className={`pill ${c.class}`}>{c.label}</span>;
}
