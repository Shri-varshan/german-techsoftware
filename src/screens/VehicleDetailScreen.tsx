import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Car, Phone, Mail, MapPin, QrCode, Printer, MessageCircle, ArrowLeft, Calendar, Gauge, Palette, Fuel, Hash, Edit2, Check, Trash2, ChevronRight } from 'lucide-react';
import { supabase, type Vehicle, type Job, deleteVehicleCascading } from '@/lib/supabase';
import { formatDate, formatINR, maskPlate } from '@/lib/constants';
import QRCodeDisplay from '@/components/QRCodeDisplay';
import QRCode from 'qrcode';
import { getCached, setCached, invalidateCache } from '@/lib/cache';

export default function VehicleDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const showQR = searchParams.get('qr') === '1';
  const [vehicle, setVehicle] = useState<Vehicle | null>(() => (id ? getCached<Vehicle>(`vehicle_${id}`) : null));
  const [jobs, setJobs] = useState<Job[]>(() => (id ? getCached<Job[]>(`vehicle_jobs_${id}`) ?? [] : []));
  const [loading, setLoading] = useState(() => !(id && getCached(`vehicle_${id}`)));
  const [deleting, setDeleting] = useState(false);
  const [editingOwner, setEditingOwner] = useState(false);
  const [ownerName, setOwnerName] = useState(() => vehicle?.customer?.name ?? '');
  const [ownerPhone, setOwnerPhone] = useState(() => vehicle?.customer?.phone ?? '');
  const [ownerEmail, setOwnerEmail] = useState(() => vehicle?.customer?.email ?? '');
  const [ownerAddress, setOwnerAddress] = useState(() => vehicle?.customer?.address ?? '');

  // New job state
  const [creatingJob, setCreatingJob] = useState(false);
  const [newComplaint, setNewComplaint] = useState('');
  const [newKm, setNewKm] = useState('');
  const [newMechanic, setNewMechanic] = useState('');
  const navigate = useNavigate();

  async function deleteVehicle() {
    if (!vehicle) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete ${vehicle.make} ${vehicle.model} (${vehicle.number_plate})?\n\nThis will permanently delete this car and all of its job cards, invoices, parts, and photos.`
    );
    if (!confirmed) return;

    setDeleting(true);
    const { error } = await deleteVehicleCascading(vehicle.id);
    if (error) {
      alert('Failed to delete vehicle: ' + error.message);
      setDeleting(false);
    } else {
      invalidateCache('vehicles');
      invalidateCache('jobs');
      invalidateCache('invoices');
      invalidateCache('dashboard');
      invalidateCache('reports');
      invalidateCache('customers');
      invalidateCache(`vehicle_${vehicle.id}`);
      invalidateCache(`vehicle_jobs_${vehicle.id}`);
      navigate('/app/vehicles');
    }
  }

  async function createNewJob(e?: React.MouseEvent | React.FormEvent) {
    if (e) e.preventDefault();
    if (!vehicle) return;
    const { data, error } = await supabase.from('jobs').insert({
      vehicle_id: vehicle.id,
      complaint: 'Service',
      km_reading: vehicle.current_km,
      assigned_mechanic: '',
      status: 'received',
    }).select('id').single();
    if (!error && data) {
      invalidateCache('jobs');
      invalidateCache('dashboard');
      navigate(`/app/jobs/${data.id}`);
    }
  }

  useEffect(() => {
    if (!id) return;
    loadData(id);
  }, [id]);

  async function loadData(vehicleId: string) {
    if (!getCached(`vehicle_${vehicleId}`)) {
      setLoading(true);
    }
    const [vehRes, jobsRes] = await Promise.all([
      supabase.from('vehicles').select('*, customer:customers(*)').eq('id', vehicleId).maybeSingle(),
      supabase.from('jobs').select('*').eq('vehicle_id', vehicleId).order('job_date', { ascending: false }),
    ]);
    const v = vehRes.data as Vehicle | null;
    const j = (jobsRes.data as Job[]) ?? [];
    setVehicle(v);
    setJobs(j);
    if (v) {
      setCached(`vehicle_${vehicleId}`, v);
      setCached(`vehicle_jobs_${vehicleId}`, j);
      setOwnerName(v.customer?.name ?? '');
      setOwnerPhone(v.customer?.phone ?? '');
      setOwnerEmail(v.customer?.email ?? '');
      setOwnerAddress(v.customer?.address ?? '');
    }
    setLoading(false);
  }

  async function saveOwner() {
    if (!vehicle?.customer_id) return;
    await supabase.from('customers').update({
      name: ownerName, phone: ownerPhone, email: ownerEmail, address: ownerAddress, updated_at: new Date().toISOString(),
    }).eq('id', vehicle.customer_id);
    setEditingOwner(false);
    loadData(vehicle.id);
  }

  function printSticker() {
    window.print();
  }

  async function sendWhatsApp() {
    if (!vehicle) return;
    try {
      const qrUrl = `${window.location.origin}/#/car/${vehicle.public_token}`;
      const dataUrl = await QRCode.toDataURL(qrUrl, { width: 600, margin: 1, errorCorrectionLevel: 'M' });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `qr-${vehicle.number_plate}.png`, { type: 'image/png' });

      const message = `Hello ${vehicle.customer?.name || 'Customer'},\nHere is the permanent live service record & QR link for your ${vehicle.make} ${vehicle.model} (${vehicle.number_plate}):\n${qrUrl}\n\nThank you for choosing German Tech!`;

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `QR Code for ${vehicle.number_plate}`,
          text: message
        });
      } else {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `qr-${vehicle.number_plate}.png`;
        link.click();
        const phone = vehicle.customer?.phone?.replace(/\D/g, '') || '';
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
      }
    } catch (err) {
      console.error('Error sharing WhatsApp QR:', err);
    }
  }

  if (loading) {
    return <div className="space-y-3">
      <div className="h-8 w-48 animate-pulse rounded bg-graphite-100 dark:bg-graphite-800" />
      <div className="h-64 animate-pulse rounded-2xl bg-graphite-100 dark:bg-graphite-800" />
    </div>;
  }

  if (!vehicle) {
    return <div className="card text-center py-10">
      <p className="text-sm text-graphite-500">Vehicle not found</p>
      <Link to="/app/vehicles" className="btn-primary mt-4">Back to vehicles</Link>
    </div>;
  }

  const qrUrl = `${window.location.origin}/#/car/${vehicle.public_token}`;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to="/app/vehicles" className="inline-flex items-center gap-1 text-sm text-graphite-500 hover:text-graphite-900 dark:hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to vehicles
      </Link>

      {/* QR result banner */}
      {showQR && (
        <div className="animate-scale-in rounded-2xl border border-signal-green/30 bg-signal-green/5 p-4">
          <div className="flex items-center gap-2 text-signal-green">
            <Check className="h-5 w-5" />
            <p className="text-sm font-semibold">Vehicle registered successfully! QR code generated.</p>
          </div>
        </div>
      )}

      {/* Vehicle header */}
      <div className="card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-graphite-100 dark:bg-graphite-800">
              <Car className="h-7 w-7 text-graphite-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-graphite-900 dark:text-white">{vehicle.make} {vehicle.model}</h2>
              <p className="text-sm text-graphite-500">{maskPlate(vehicle.number_plate)} · {vehicle.year}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={printSticker} className="btn-secondary text-xs">
              <Printer className="h-4 w-4" /> Print sticker
            </button>
            <button
              onClick={deleteVehicle}
              disabled={deleting}
              className="btn-ghost text-xs text-signal-red hover:bg-signal-red/10 border border-signal-red/20"
              title="Delete this vehicle"
            >
              <Trash2 className="h-4 w-4" /> {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>

        {/* Vehicle specs grid */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <SpecItem icon={Calendar} label="Year" value={String(vehicle.year ?? '-')} />
          <SpecItem icon={Gauge} label="Current km" value={vehicle.current_km.toLocaleString('en-IN')} />
          <SpecItem icon={Fuel} label="Fuel" value={vehicle.fuel_type || '-'} />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SpecItem icon={Hash} label="VIN" value={vehicle.vin || '-'} />
          <SpecItem icon={Calendar} label="Next service" value={vehicle.next_service_date ? formatDate(vehicle.next_service_date) : 'Not set'} />
        </div>
      </div>

      {/* Permanent QR Code */}
      <div className="card">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
          <QRCodeDisplay value={qrUrl} size={180} />
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-accent-500" />
              <h3 className="text-sm font-bold text-graphite-900 dark:text-white">Permanent QR Code</h3>
            </div>
            <p className="text-xs text-graphite-500">
              This QR code is permanent for this car. Print it as a sticker and place it on the car.
              Customers scan it to see their full service history. The link never changes.
            </p>
            <div className="flex flex-wrap gap-2">
              <button onClick={sendWhatsApp} className="btn-primary text-xs">
                <MessageCircle className="h-4 w-4" /> Send via WhatsApp
              </button>
              <a href={qrUrl} target="_blank" rel="noreferrer" className="btn-secondary text-xs inline-flex items-center">
                Preview Customer View
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Owner details */}
      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide text-graphite-500">Owner</h3>
          {!editingOwner ? (
            <button onClick={() => setEditingOwner(true)} className="btn-ghost text-xs">
              <Edit2 className="h-3.5 w-3.5" /> Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setEditingOwner(false)} className="btn-ghost text-xs">Cancel</button>
              <button onClick={saveOwner} className="btn-primary text-xs">Save</button>
            </div>
          )}
        </div>
        {!editingOwner ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-graphite-700 dark:text-graphite-300">
              <Phone className="h-4 w-4 text-graphite-400" /> {vehicle.customer?.phone || '-'}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <input className="input-field" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Name" />
            <input className="input-field" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} placeholder="Phone" />
          </div>
        )}
      </div>

      {/* Service history */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide text-graphite-500">Service History</h3>
          <button onClick={createNewJob} className="btn-primary text-xs">
            + New Job
          </button>
        </div>
        {jobs.length === 0 ? (
          <div className="card flex flex-col items-center py-8 text-center">
            <Car className="h-8 w-8 text-graphite-300" />
            <p className="mt-2 text-sm text-graphite-500">No jobs yet for this vehicle</p>
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => (
              <Link key={job.id} to={`/app/jobs/${job.id}`} className="card flex items-center justify-between transition-all hover:border-accent-300">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-semibold text-graphite-900 dark:text-white">{job.complaint}</p>
                    <p className="text-xs text-graphite-500">{formatDate(job.job_date)} · {job.km_reading.toLocaleString('en-IN')} km</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-graphite-300" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SpecItem({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-graphite-400" />
      <div>
        <p className="text-2xs font-semibold uppercase tracking-wide text-graphite-400">{label}</p>
        <p className="text-sm font-semibold text-graphite-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

function JobStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; class: string }> = {
    received: { label: 'Received', class: 'bg-graphite-100 text-graphite-600 dark:bg-graphite-800 dark:text-graphite-300' },
    in_progress: { label: 'In Progress', class: 'bg-signal-amber/10 text-signal-amber' },
    ready: { label: 'Ready', class: 'bg-accent-500/10 text-accent-600 dark:text-accent-400' },
    completed: { label: 'Completed', class: 'bg-signal-green/10 text-signal-green' },
  };
  const c = config[status] ?? config.received;
  return <span className={`pill ${c.class}`}>{c.label}</span>;
}
