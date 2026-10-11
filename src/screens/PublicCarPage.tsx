import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Car, Wrench, Calendar, Gauge, Cog, MessageCircle, Phone, MapPin, CheckCircle2, Clock, ChevronRight } from 'lucide-react';
import { supabase, type PublicCarHistory } from '@/lib/supabase';
import { formatDate, maskPlate } from '@/lib/constants';

export default function PublicCarPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PublicCarHistory | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      const { data: result } = await supabase.rpc('public_car_history', { p_public_token: token });
      setData(result as PublicCarHistory);
      setLoading(false);
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-graphite-50 dark:bg-graphite-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-graphite-200 border-t-accent-500" />
          <p className="text-sm text-graphite-500">Loading service history…</p>
        </div>
      </div>
    );
  }

  if (!data || !data.found) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-graphite-50 px-6 dark:bg-graphite-950">
        <div className="max-w-sm text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-graphite-100 dark:bg-graphite-800">
            <Car className="h-8 w-8 text-graphite-400" />
          </div>
          <h1 className="mt-4 text-lg font-bold text-graphite-900 dark:text-white">Vehicle not found</h1>
          <p className="mt-2 text-sm text-graphite-500">
            This QR code doesn't match any vehicle in our system. Please ask the workshop staff for assistance.
          </p>
        </div>
      </div>
    );
  }

  const { vehicle, jobs, workshop, next_service_date, next_service_km } = data;
  const workshopName = workshop?.workshop_name || 'German Tech';
  const workshopPhone = workshop?.phone || '';
  const workshopAddress = workshop?.address || '';

  return (
    <div className="min-h-screen bg-gradient-to-b from-graphite-50 to-graphite-100 dark:from-graphite-950 dark:to-graphite-900">
      {/* Header with workshop branding */}
      <header className="sticky top-0 z-10 border-b border-graphite-200 bg-white/80 backdrop-blur-md dark:border-graphite-800 dark:bg-graphite-900/80">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="German Tech" className="h-8 w-8 rounded-lg object-contain bg-black p-0.5" />
            <span className="text-sm font-bold text-graphite-900 dark:text-white">{workshopName}</span>
          </div>
          <span className="text-2xs text-graphite-400">Service History</span>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* Car card */}
        <div className="rounded-2xl border border-graphite-200 bg-white p-5 shadow-sm dark:border-graphite-800 dark:bg-graphite-900">
          {/* Welcome and Car info */}
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-graphite-100 to-graphite-200 shadow-inner dark:from-graphite-800 dark:to-graphite-900">
              <Car className="h-8 w-8 text-graphite-500 dark:text-graphite-400" />
            </div>
            <div className="flex-1">
              {vehicle!.customer_name && (
                <p className="text-xs font-bold uppercase tracking-wider text-accent-500 mb-1">
                  Welcome back, {vehicle!.customer_name}!
                </p>
              )}
              <h1 className="text-2xl font-black tracking-tight text-graphite-900 dark:text-white">
                {vehicle!.make} {vehicle!.model}
              </h1>
              <div className="mt-1 flex items-center justify-center gap-2 sm:justify-start">
                <span className="rounded bg-graphite-100 px-2 py-0.5 text-xs font-bold text-graphite-700 dark:bg-graphite-800 dark:text-graphite-300">
                  {maskPlate(vehicle!.number_plate)}
                </span>
                <span className="text-sm font-medium text-graphite-500">
                  · {vehicle!.year} Model
                </span>
              </div>
            </div>
          </div>

          {/* Next service */}
          {(next_service_date || next_service_km) && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-accent-500/5 p-3">
              <Calendar className="h-4 w-4 text-accent-500" />
              <p className="text-xs text-graphite-600 dark:text-graphite-300">
                <span className="font-semibold">Next service due:</span>{' '}
                {next_service_date ? formatDate(next_service_date) : ''}
                {next_service_date && next_service_km ? ' or ' : ''}
                {next_service_km ? `${next_service_km.toLocaleString('en-IN')} km` : ''}
              </p>
            </div>
          )}

          {/* Contact buttons */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {workshopPhone && (
              <a href={`tel:${workshopPhone}`} className="flex flex-col items-center gap-1 rounded-xl bg-graphite-50 py-3 text-xs font-semibold text-graphite-700 transition-colors hover:bg-graphite-100 dark:bg-graphite-800 dark:text-graphite-300">
                <Phone className="h-4 w-4" /> Call
              </a>
            )}
            {workshopPhone && (
              <a href={`https://wa.me/${workshopPhone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1 rounded-xl bg-signal-green/10 py-3 text-xs font-semibold text-signal-green transition-colors hover:bg-signal-green/20">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            )}
            {workshopAddress && (
              <a href={`https://maps.google.com/?q=${encodeURIComponent(workshopAddress)}`} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1 rounded-xl bg-graphite-50 py-3 text-xs font-semibold text-graphite-700 transition-colors hover:bg-graphite-100 dark:bg-graphite-800 dark:text-graphite-300">
                <MapPin className="h-4 w-4" /> Directions
              </a>
            )}
          </div>
        </div>

        {/* Service timeline */}
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-graphite-500">
            Service History
          </h2>

          {!jobs || jobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-graphite-200 p-8 text-center dark:border-graphite-700">
              <Clock className="mx-auto h-8 w-8 text-graphite-300" />
              <p className="mt-2 text-sm text-graphite-500">
                History will appear shortly once your first service is completed.
              </p>
            </div>
          ) : (
            <div className="relative space-y-3">
              {/* Timeline line */}
              <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-graphite-200 dark:bg-graphite-700" />

              {jobs.map((job, idx) => (
                <div key={idx} className="relative flex gap-4">
                  {/* Timeline dot */}
                  <div className="relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white dark:bg-graphite-900">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-signal-green/10">
                      <CheckCircle2 className="h-5 w-5 text-signal-green" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 rounded-2xl border border-graphite-200 bg-white p-4 shadow-sm dark:border-graphite-800 dark:bg-graphite-900">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-graphite-900 dark:text-white">
                        {formatDate(job.job_date)}
                      </p>
                      <span className="text-2xs text-graphite-400">
                        {job.km_reading.toLocaleString('en-IN')} km
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-graphite-700 dark:text-graphite-300">
                      {job.complaint}
                    </p>

                    {/* Parts replaced */}
                    {job.parts && job.parts.length > 0 && (
                      <div className="mt-3">
                        <p className="mb-1.5 flex items-center gap-1 text-2xs font-semibold uppercase tracking-wide text-graphite-400">
                          <Cog className="h-3 w-3" /> Parts replaced
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {job.parts.map((part, pi) => (
                            <span key={pi} className="rounded-lg bg-graphite-50 px-2.5 py-1 text-xs font-medium text-graphite-600 dark:bg-graphite-800 dark:text-graphite-300">
                              {part.part_name}
                              {part.part_number && (
                                <span className="ml-1 text-graphite-400">#{part.part_number}</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Photos */}
                    {job.photos && job.photos.length > 0 && (
                      <div className="mt-3 flex gap-2 overflow-x-auto">
                        {job.photos.map((photo, pi) => (
                          <img
                            key={pi}
                            src={photo.photo_url}
                            alt={photo.photo_type}
                            className="h-20 w-20 flex-shrink-0 rounded-lg object-cover"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center">
          <p className="text-2xs text-graphite-400">
            Powered by <span className="font-semibold">German Tech</span>
          </p>
        </footer>
      </div>
    </div>
  );
}
