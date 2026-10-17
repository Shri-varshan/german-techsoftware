import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Car, Wrench, FileText, Calendar, ChevronLeft, ChevronRight, 
  TrendingUp, IndianRupee, ShieldCheck, CheckCircle2, Clock, 
  ExternalLink, Printer, BarChart3, ArrowUpRight, RotateCcw
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatINR, formatDate, maskPlate } from '@/lib/constants';

type PeriodMode = 'daily' | 'weekly' | 'monthly';

interface DayBreakdown {
  dayName: string;
  dateStr: string;
  dateObj: Date;
  vehiclesCount: number;
  jobsCount: number;
  invoicesCount: number;
  revenue: number;
}

export default function AdminDashboardScreen() {
  const [mode, setMode] = useState<PeriodMode>('weekly');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);

  // Loaded data
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  // Active detail view tab
  const [detailTab, setDetailTab] = useState<'vehicles' | 'jobs' | 'invoices'>('vehicles');

  // Compute date range based on mode
  const { start, end, label, days } = getPeriodInfo(mode, selectedDate);

  useEffect(() => {
    loadAdminData();
  }, [mode, selectedDate]);

  async function loadAdminData() {
    setLoading(true);
    const startIso = start.toISOString();
    const endIso = end.toISOString();

    const [vRes, jRes, iRes] = await Promise.all([
      supabase
        .from('vehicles')
        .select('id, make, model, year, number_plate, colour, created_at, customer:customers(name, phone)')
        .gte('created_at', startIso)
        .lte('created_at', endIso)
        .order('created_at', { ascending: false }),
      supabase
        .from('jobs')
        .select('id, complaint, status, km_reading, job_date, created_at, vehicle:vehicles(id, make, model, number_plate, customer:customers(name, phone))')
        .gte('created_at', startIso)
        .lte('created_at', endIso)
        .order('created_at', { ascending: false }),
      supabase
        .from('invoices')
        .select('id, invoice_number, grand_total, subtotal, gst_total, created_at, job:jobs(id, complaint, vehicle:vehicles(id, make, model, number_plate, customer:customers(name)))')
        .gte('created_at', startIso)
        .lte('created_at', endIso)
        .order('created_at', { ascending: false }),
    ]);

    setVehicles(vRes.data ?? []);
    setJobs(jRes.data ?? []);
    setInvoices(iRes.data ?? []);
    setLoading(false);
  }

  function handlePrev() {
    const next = new Date(selectedDate);
    if (mode === 'daily') {
      next.setDate(next.getDate() - 1);
    } else if (mode === 'weekly') {
      next.setDate(next.getDate() - 7);
    } else {
      next.setMonth(next.getMonth() - 1);
    }
    setSelectedDate(next);
  }

  function handleNext() {
    const next = new Date(selectedDate);
    if (mode === 'daily') {
      next.setDate(next.getDate() + 1);
    } else if (mode === 'weekly') {
      next.setDate(next.getDate() + 7);
    } else {
      next.setMonth(next.getMonth() + 1);
    }
    setSelectedDate(next);
  }

  function handleToday() {
    setSelectedDate(new Date());
  }

  // Metrics
  const totalBilled = invoices.reduce((sum, inv) => sum + (Number(inv.grand_total) || 0), 0);
  const completedJobsCount = jobs.filter((j) => j.status === 'completed').length;
  const inProgressJobsCount = jobs.filter((j) => j.status === 'in_progress').length;
  const receivedJobsCount = jobs.filter((j) => j.status === 'received').length;

  // Build weekly 7-day breakdown (Sunday to Saturday)
  const weeklyBreakdown: DayBreakdown[] = days.map((dayDate) => {
    const dayStart = new Date(dayDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayDate);
    dayEnd.setHours(23, 59, 59, 999);

    const dayVehicles = vehicles.filter((v) => {
      const d = new Date(v.created_at);
      return d >= dayStart && d <= dayEnd;
    });

    const dayJobs = jobs.filter((j) => {
      const d = new Date(j.created_at || j.job_date);
      return d >= dayStart && d <= dayEnd;
    });

    const dayInvoices = invoices.filter((inv) => {
      const d = new Date(inv.created_at);
      return d >= dayStart && d <= dayEnd;
    });

    const dayRevenue = dayInvoices.reduce((s, inv) => s + (Number(inv.grand_total) || 0), 0);

    return {
      dayName: dayDate.toLocaleDateString('en-US', { weekday: 'short' }),
      dateStr: dayDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
      dateObj: dayDate,
      vehiclesCount: dayVehicles.length,
      jobsCount: dayJobs.length,
      invoicesCount: dayInvoices.length,
      revenue: dayRevenue,
    };
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-500/10 text-accent-600 dark:text-accent-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h1 className="text-xl font-black text-graphite-900 dark:text-white">Admin Dashboard</h1>
            <span className="rounded-lg bg-accent-500/10 px-2 py-0.5 text-2xs font-extrabold text-accent-600 dark:text-accent-400 uppercase tracking-wide">
              Executive
            </span>
          </div>
          <p className="mt-1 text-xs text-graphite-500">
            Performance analytics across vehicle registrations, job cards, and billed invoices.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex rounded-xl bg-graphite-100 p-1 dark:bg-graphite-800">
            <button
              onClick={() => setMode('daily')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                mode === 'daily'
                  ? 'bg-white text-graphite-900 shadow dark:bg-graphite-900 dark:text-white'
                  : 'text-graphite-600 dark:text-graphite-400 hover:text-graphite-900'
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setMode('weekly')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                mode === 'weekly'
                  ? 'bg-white text-graphite-900 shadow dark:bg-graphite-900 dark:text-white'
                  : 'text-graphite-600 dark:text-graphite-400 hover:text-graphite-900'
              }`}
            >
              Weekly (Sun-Sat)
            </button>
            <button
              onClick={() => setMode('monthly')}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                mode === 'monthly'
                  ? 'bg-white text-graphite-900 shadow dark:bg-graphite-900 dark:text-white'
                  : 'text-graphite-600 dark:text-graphite-400 hover:text-graphite-900'
              }`}
            >
              Monthly
            </button>
          </div>

          <button
            onClick={() => window.print()}
            className="btn-secondary text-xs flex items-center gap-1.5"
            title="Print this report"
          >
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
        </div>
      </div>

      {/* Date Navigation Bar */}
      <div className="card flex flex-wrap items-center justify-between gap-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="p-1.5 rounded-lg border border-graphite-200 hover:bg-graphite-100 dark:border-graphite-700 dark:hover:bg-graphite-800 transition-colors"
            title="Previous period"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={handleNext}
            className="p-1.5 rounded-lg border border-graphite-200 hover:bg-graphite-100 dark:border-graphite-700 dark:hover:bg-graphite-800 transition-colors"
            title="Next period"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-accent-500" />
            <span className="text-sm font-bold text-graphite-900 dark:text-white">
              {label}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {mode === 'weekly' && (
            <span className="text-2xs font-semibold px-2.5 py-1 rounded-md bg-graphite-100 dark:bg-graphite-800 text-graphite-500">
              Sunday → Saturday Week
            </span>
          )}
          <button
            onClick={handleToday}
            className="text-xs font-semibold text-accent-500 hover:underline flex items-center gap-1"
          >
            <RotateCcw className="h-3 w-3" /> Current {mode === 'daily' ? 'Day' : mode === 'weekly' ? 'Week' : 'Month'}
          </button>
        </div>
      </div>

      {/* 3 Core KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Vehicles Card */}
        <div 
          onClick={() => setDetailTab('vehicles')}
          className={`card cursor-pointer border-2 transition-all ${
            detailTab === 'vehicles' ? 'border-accent-500 shadow-md ring-2 ring-accent-500/20' : 'hover:border-graphite-300 dark:hover:border-graphite-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-graphite-500">Vehicles Registered</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-500/10 text-accent-600 dark:text-accent-400">
              <Car className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-graphite-900 dark:text-white">
              {loading ? '…' : vehicles.length}
            </span>
            <span className="text-xs text-graphite-500">in this period</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-graphite-100 dark:border-graphite-800 pt-2 text-2xs text-graphite-500">
            <span>Click to view registered cars</span>
            <ArrowUpRight className="h-3 w-3" />
          </div>
        </div>

        {/* Job Cards Card */}
        <div 
          onClick={() => setDetailTab('jobs')}
          className={`card cursor-pointer border-2 transition-all ${
            detailTab === 'jobs' ? 'border-amber-500 shadow-md ring-2 ring-amber-500/20' : 'hover:border-graphite-300 dark:hover:border-graphite-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-graphite-500">Job Cards Created</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-signal-amber/10 text-signal-amber">
              <Wrench className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-graphite-900 dark:text-white">
              {loading ? '…' : jobs.length}
            </span>
            <span className="text-xs text-graphite-500">total created</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-graphite-100 dark:border-graphite-800 pt-2 text-2xs text-graphite-500">
            <span>{completedJobsCount} completed · {inProgressJobsCount + receivedJobsCount} ongoing</span>
            <ArrowUpRight className="h-3 w-3" />
          </div>
        </div>

        {/* Invoices & Revenue Card */}
        <div 
          onClick={() => setDetailTab('invoices')}
          className={`card cursor-pointer border-2 transition-all ${
            detailTab === 'invoices' ? 'border-signal-green shadow-md ring-2 ring-signal-green/20' : 'hover:border-graphite-300 dark:hover:border-graphite-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-graphite-500">Invoices & Revenue</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-signal-green/10 text-signal-green">
              <IndianRupee className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-graphite-900 dark:text-white">
              {loading ? '…' : formatINR(totalBilled)}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-graphite-100 dark:border-graphite-800 pt-2 text-2xs text-graphite-500">
            <span>{invoices.length} invoices generated</span>
            <ArrowUpRight className="h-3 w-3" />
          </div>
        </div>
      </div>

      {/* Weekly Visual Breakdown (Sunday to Saturday) */}
      {mode === 'weekly' && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-accent-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-graphite-700 dark:text-graphite-300">
                Weekly Breakdown: Sunday to Saturday
              </h3>
            </div>
            <span className="text-2xs text-graphite-400 font-semibold">
              7 Days Comparison
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {weeklyBreakdown.map((day, idx) => {
              const isToday = day.dateObj.toDateString() === new Date().toDateString();
              return (
                <div 
                  key={idx}
                  className={`rounded-xl border p-3 flex flex-col justify-between transition-all ${
                    isToday 
                      ? 'border-accent-500 bg-accent-500/5 dark:bg-accent-500/10' 
                      : 'border-graphite-200 dark:border-graphite-800 bg-graphite-50/50 dark:bg-graphite-900/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-black uppercase ${isToday ? 'text-accent-500' : 'text-graphite-700 dark:text-graphite-300'}`}>
                        {day.dayName}
                      </span>
                      {isToday && (
                        <span className="h-2 w-2 rounded-full bg-accent-500" title="Today" />
                      )}
                    </div>
                    <p className="text-2xs text-graphite-400 font-medium mt-0.5">{day.dateStr}</p>
                  </div>

                  <div className="mt-3 space-y-1.5 border-t border-graphite-200 dark:border-graphite-800 pt-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-graphite-400 flex items-center gap-1 text-2xs">
                        <Car className="h-3 w-3 text-accent-500" /> Cars
                      </span>
                      <span className="font-bold text-graphite-900 dark:text-white">{day.vehiclesCount}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-graphite-400 flex items-center gap-1 text-2xs">
                        <Wrench className="h-3 w-3 text-signal-amber" /> Jobs
                      </span>
                      <span className="font-bold text-graphite-900 dark:text-white">{day.jobsCount}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-graphite-400 flex items-center gap-1 text-2xs">
                        <FileText className="h-3 w-3 text-signal-green" /> Bills
                      </span>
                      <span className="font-bold text-graphite-900 dark:text-white">{day.invoicesCount}</span>
                    </div>

                    <div className="pt-1 border-t border-dashed border-graphite-200 dark:border-graphite-800 text-2xs font-extrabold text-signal-green text-right">
                      {day.revenue > 0 ? formatINR(day.revenue) : '₹0'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detailed Activity Lists for Selected Period */}
      <div className="card space-y-4">
        {/* Detail Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-graphite-200 dark:border-graphite-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDetailTab('vehicles')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                detailTab === 'vehicles'
                  ? 'bg-accent-500 text-white shadow-sm'
                  : 'text-graphite-600 dark:text-graphite-400 hover:bg-graphite-100 dark:hover:bg-graphite-800'
              }`}
            >
              <Car className="h-3.5 w-3.5" /> Registered Vehicles ({vehicles.length})
            </button>
            <button
              onClick={() => setDetailTab('jobs')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                detailTab === 'jobs'
                  ? 'bg-signal-amber text-white shadow-sm'
                  : 'text-graphite-600 dark:text-graphite-400 hover:bg-graphite-100 dark:hover:bg-graphite-800'
              }`}
            >
              <Wrench className="h-3.5 w-3.5" /> Job Cards ({jobs.length})
            </button>
            <button
              onClick={() => setDetailTab('invoices')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                detailTab === 'invoices'
                  ? 'bg-signal-green text-white shadow-sm'
                  : 'text-graphite-600 dark:text-graphite-400 hover:bg-graphite-100 dark:hover:bg-graphite-800'
              }`}
            >
              <FileText className="h-3.5 w-3.5" /> Invoices & Bills ({invoices.length})
            </button>
          </div>

          <span className="text-2xs text-graphite-400">
            Showing records for: <span className="font-semibold text-graphite-600 dark:text-graphite-300">{label}</span>
          </span>
        </div>

        {/* Tab 1: Registered Vehicles */}
        {detailTab === 'vehicles' && (
          <div>
            {vehicles.length === 0 ? (
              <div className="py-8 text-center text-sm text-graphite-400">
                No vehicles registered in this period.
              </div>
            ) : (
              <div className="space-y-2">
                {vehicles.map((v) => (
                  <div
                    key={v.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-graphite-200 bg-white p-3.5 dark:border-graphite-800 dark:bg-graphite-900"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-graphite-100 dark:bg-graphite-800 text-graphite-400">
                        <Car className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-graphite-900 dark:text-white">
                            {v.make} {v.model} ({v.year || '-'})
                          </span>
                          <span className="rounded bg-graphite-100 dark:bg-graphite-800 px-2 py-0.5 text-xs font-extrabold text-graphite-700 dark:text-graphite-300">
                            {maskPlate(v.number_plate)}
                          </span>
                        </div>
                        <p className="text-xs text-graphite-500 mt-0.5">
                          Owner: <span className="font-semibold text-graphite-700 dark:text-graphite-300">{v.customer?.name || 'Walk-in'}</span> · Phone: {v.customer?.phone || '-'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 justify-between sm:justify-end">
                      <span className="text-2xs text-graphite-400 font-medium">
                        📅 {new Date(v.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <Link
                        to={`/app/vehicles/${v.id}`}
                        className="btn-ghost text-xs flex items-center gap-1 border border-graphite-200 dark:border-graphite-700 text-primary-600 dark:text-primary-400"
                      >
                        Open <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Job Cards */}
        {detailTab === 'jobs' && (
          <div>
            {jobs.length === 0 ? (
              <div className="py-8 text-center text-sm text-graphite-400">
                No job cards created in this period.
              </div>
            ) : (
              <div className="space-y-2">
                {jobs.map((j) => (
                  <div
                    key={j.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-graphite-200 bg-white p-3.5 dark:border-graphite-800 dark:bg-graphite-900"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-signal-amber/10 text-signal-amber">
                        <Wrench className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-graphite-900 dark:text-white">
                            {j.complaint || 'Service Job'}
                          </span>
                          <span className={`rounded-lg px-2 py-0.5 text-2xs font-extrabold capitalize ${
                            j.status === 'completed'
                              ? 'bg-signal-green/10 text-signal-green'
                              : j.status === 'in_progress'
                              ? 'bg-signal-amber/10 text-signal-amber'
                              : 'bg-primary-100 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300'
                          }`}>
                            {j.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-graphite-500 mt-0.5">
                          {j.vehicle?.make} {j.vehicle?.model} · <span className="font-bold">{maskPlate(j.vehicle?.number_plate || '')}</span> · {j.km_reading ? `${j.km_reading.toLocaleString('en-IN')} KM` : 'KM not set'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 justify-between sm:justify-end">
                      <span className="text-2xs text-graphite-400 font-medium">
                        📅 {new Date(j.created_at || j.job_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <Link
                        to={`/app/jobs/${j.id}`}
                        className="btn-ghost text-xs flex items-center gap-1 border border-graphite-200 dark:border-graphite-700 text-primary-600 dark:text-primary-400"
                      >
                        Open Job <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Invoices */}
        {detailTab === 'invoices' && (
          <div>
            {invoices.length === 0 ? (
              <div className="py-8 text-center text-sm text-graphite-400">
                No invoices generated in this period.
              </div>
            ) : (
              <div className="space-y-2">
                {invoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-graphite-200 bg-white p-3.5 dark:border-graphite-800 dark:bg-graphite-900"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-signal-green/10 text-signal-green">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-graphite-900 dark:text-white">
                            Invoice #{inv.invoice_number}
                          </span>
                          <span className="text-sm font-black text-signal-green">
                            {formatINR(Number(inv.grand_total) || 0)}
                          </span>
                        </div>
                        <p className="text-xs text-graphite-500 mt-0.5">
                          {inv.job?.vehicle?.make} {inv.job?.vehicle?.model} · <span className="font-bold">{maskPlate(inv.job?.vehicle?.number_plate || '')}</span> · {inv.job?.vehicle?.customer?.name || 'Customer'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 justify-between sm:justify-end">
                      <span className="text-2xs text-graphite-400 font-medium">
                        📅 {new Date(inv.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <Link
                        to={`/app/invoices/${inv.id}`}
                        className="btn-ghost text-xs flex items-center gap-1 border border-graphite-200 dark:border-graphite-700 text-signal-green"
                      >
                        View Invoice <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper: Calculate start, end, label, and day array for Daily, Weekly (Sunday to Saturday), or Monthly
function getPeriodInfo(mode: PeriodMode, selectedDate: Date) {
  if (mode === 'daily') {
    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(23, 59, 59, 999);

    const isToday = selectedDate.toDateString() === new Date().toDateString();
    const label = isToday 
      ? `Today · ${selectedDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}`
      : selectedDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });

    return { start, end, label, days: [new Date(selectedDate)] };
  }

  if (mode === 'weekly') {
    // Specifically calculate Sunday to Saturday
    const d = new Date(selectedDate);
    const dayOfWeek = d.getDay(); // 0 is Sunday, 6 is Saturday

    const start = new Date(d);
    start.setDate(d.getDate() - dayOfWeek);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    // Array of 7 days from Sunday to Saturday
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const cur = new Date(start);
      cur.setDate(start.getDate() + i);
      days.push(cur);
    }

    const startLabel = start.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    const endLabel = end.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    const label = `${startLabel} – ${endLabel}`;

    return { start, end, label, days };
  }

  // Monthly
  const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59, 999);

  const label = selectedDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  // Generate all days in the month
  const days: Date[] = [];
  const daysInMonth = end.getDate();
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i));
  }

  return { start, end, label, days };
}
