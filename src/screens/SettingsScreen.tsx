import { useEffect, useState } from 'react';
import { Save, Check } from 'lucide-react';
import { supabase, type WorkshopSettings } from '@/lib/supabase';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<WorkshopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('workshop_settings').select('*').maybeSingle();
      setSettings(data as WorkshopSettings | null);
      setLoading(false);
    })();
  }, []);

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    await supabase.from('workshop_settings').update({
      workshop_name: settings.workshop_name,
      address: settings.address,
      phone: settings.phone,
      gstin: settings.gstin,
      invoice_prefix: settings.invoice_prefix,
      logo_url: settings.logo_url,
      updated_at: new Date().toISOString(),
    }).eq('id', settings.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) return <div className="h-64 animate-pulse rounded-2xl bg-graphite-100 dark:bg-graphite-800" />;

  if (!settings) {
    return <div className="card text-center py-8">
      <p className="text-sm text-graphite-500">Settings not found. Please contact support.</p>
    </div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="card space-y-4">
        <h2 className="text-lg font-bold text-graphite-900 dark:text-white">Workshop details</h2>

        <div>
          <label className="input-label">Workshop name</label>
          <input className="input-field" value={settings.workshop_name} onChange={(e) => setSettings({ ...settings, workshop_name: e.target.value })} />
        </div>

        <div>
          <label className="input-label">Phone</label>
          <input className="input-field" value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} />
        </div>

        <div>
          <label className="input-label">Address</label>
          <textarea className="input-field min-h-[80px]" value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} />
        </div>

        <div>
          <label className="input-label">Workshop Logo</label>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-graphite-100 dark:bg-graphite-800">
            <img src={settings.logo_url || '/logo.png'} alt="German Tech" className="h-12 w-12 object-contain rounded-lg bg-black p-1 shadow" />
            <div>
              <p className="text-xs font-semibold text-graphite-900 dark:text-white">German Tech Official Logo</p>
              <p className="text-2xs text-graphite-500">Appears on invoices, browser favicon, and customer QR pages</p>
            </div>
          </div>
        </div>

        <div>
          <label className="input-label">Invoice prefix</label>
          <input className="input-field" value={settings.invoice_prefix} onChange={(e) => setSettings({ ...settings, invoice_prefix: e.target.value })} maxLength={5} />
        </div>

        <div>
          <label className="input-label">Custom Logo URL (Optional)</label>
          <input className="input-field" value={settings.logo_url} onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })} placeholder="https://…" />
        </div>

        <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
          {saving ? 'Saving…' : saved ? (
            <><Check className="h-4 w-4" /> Saved</>
          ) : (
            <><Save className="h-4 w-4" /> Save settings</>
          )}
        </button>
      </div>
    </div>
  );
}
