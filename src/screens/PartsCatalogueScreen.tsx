import { useEffect, useState, type FormEvent } from 'react';
import { Search, Plus, Trash2, Package, Edit2, Check, X } from 'lucide-react';
import { supabase, type PartCatalogueItem } from '@/lib/supabase';
import { CAR_MAKES, formatINR } from '@/lib/constants';
import { getCached, setCached } from '@/lib/cache';

export default function PartsCatalogueScreen() {
  const [parts, setParts] = useState<PartCatalogueItem[]>(() => getCached('parts') ?? []);
  const [loading, setLoading] = useState(() => !getCached('parts'));
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [price, setPrice] = useState('');
  const [make, setMake] = useState('');

  useEffect(() => { loadParts(); }, []);

  async function loadParts() {
    if (!getCached('parts')) {
      setLoading(true);
    }
    const { data } = await supabase.from('parts_catalogue').select('*').order('part_name');
    if (data) {
      const pList = data as PartCatalogueItem[];
      setParts(pList);
      setCached('parts', pList);
    }
    setLoading(false);
  }

  function resetForm() {
    setName(''); setNumber(''); setPrice(''); setMake(''); setEditingId(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (editingId) {
      await supabase.from('parts_catalogue').update({
        part_name: name, part_number: number, default_price: parseFloat(price) || 0,
        default_gst: 0, vehicle_make: make,
      }).eq('id', editingId);
    } else {
      await supabase.from('parts_catalogue').insert({
        part_name: name, part_number: number, default_price: parseFloat(price) || 0,
        default_gst: 0, vehicle_make: make,
      });
    }
    resetForm();
    setShowForm(false);
    loadParts();
  }

  function startEdit(p: PartCatalogueItem) {
    setEditingId(p.id);
    setName(p.part_name); setNumber(p.part_number); setPrice(String(p.default_price));
    setMake(p.vehicle_make);
    setShowForm(true);
  }

  async function deletePart(id: string) {
    await supabase.from('parts_catalogue').delete().eq('id', id);
    setParts(parts.filter((p) => p.id !== id));
  }

  const filtered = parts.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return p.part_name.toLowerCase().includes(q) || p.part_number.toLowerCase().includes(q) || p.vehicle_make.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-graphite-400" />
          <input className="input-field pl-12" placeholder="Search parts…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary">
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-3 animate-slide-up">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-graphite-900 dark:text-white">{editingId ? 'Edit part' : 'New part'}</h3>
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="btn-ghost p-1.5"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Part name *</label>
              <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="input-label">Part number</label>
              <input className="input-field" value={number} onChange={(e) => setNumber(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="input-label">Default price ₹</label>
              <input className="input-field" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div>
              <label className="input-label">Make</label>
              <select className="input-field" value={make} onChange={(e) => setMake(e.target.value)}>
                <option value="">All</option>
                {CAR_MAKES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" className="btn-primary w-full">{editingId ? 'Update' : 'Add part'}</button>
        </form>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-graphite-100 dark:bg-graphite-800" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center py-12 text-center">
          <Package className="h-10 w-10 text-graphite-300" />
          <p className="mt-3 text-sm text-graphite-500">{search ? 'No parts match your search' : 'No parts in catalogue yet'}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((p) => (
            <div key={p.id} className="card flex items-center justify-between py-3">
              <div className="flex-1">
                <p className="text-sm font-semibold text-graphite-900 dark:text-white">{p.part_name}</p>
                <p className="text-xs text-graphite-500">
                  {p.part_number && `#${p.part_number} · `}{p.vehicle_make || 'All makes'} · {formatINR(p.default_price)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => startEdit(p)} className="btn-ghost p-2"><Edit2 className="h-4 w-4" /></button>
                <button onClick={() => deletePart(p.id)} className="btn-ghost p-2 text-graphite-300 hover:text-signal-red"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
