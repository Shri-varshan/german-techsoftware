import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Package, Clock, CheckCircle2, AlertTriangle, Lock, Mic, Gauge } from 'lucide-react';
import { supabase, type Job, type JobPart, type JobLabour, type Vehicle, type Invoice } from '@/lib/supabase';
import { formatINR, formatDate, maskPlate } from '@/lib/constants';

interface JobWithVehicle extends Job {
  vehicle?: Vehicle & { customer?: { name: string; phone: string } };
}

export default function JobDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobWithVehicle | null>(null);
  const [parts, setParts] = useState<JobPart[]>([]);
  const [labour, setLabour] = useState<JobLabour[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComplete, setShowComplete] = useState(false);
  const [showNewJob, setShowNewJob] = useState(false);
  const [catalogue, setCatalogue] = useState<{ part_name: string; part_number: string; default_price: number; default_gst: number }[]>([]);

  // New job form
  const [newComplaint, setNewComplaint] = useState('');
  const [newKm, setNewKm] = useState('');
  const [newMechanic, setNewMechanic] = useState('');

  // Add part form
  const [partName, setPartName] = useState('');
  const [partPrice, setPartPrice] = useState('');
  const [showPartForm, setShowPartForm] = useState(false);

  // Add labour form
  const [labourAmount, setLabourAmount] = useState('');
  const [showLabourForm, setShowLabourForm] = useState(false);

  // Status update
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadJob(id);
    loadCatalogue();
  }, [id]);

  async function loadCatalogue() {
    const { data } = await supabase.from('parts_catalogue').select('part_name, part_number, default_price, default_gst');
    setCatalogue(data ?? []);
  }

  async function loadJob(jobId: string) {
    setLoading(true);
    const [jobRes, partsRes, labourRes, photosRes] = await Promise.all([
      supabase.from('jobs').select('*, vehicle:vehicles(*, customer:customers(*))').eq('id', jobId).maybeSingle(),
      supabase.from('job_parts').select('*').eq('job_id', jobId).order('created_at'),
      supabase.from('job_labour').select('*').eq('job_id', jobId).order('created_at'),
      supabase.from('job_photos').select('*').eq('job_id', jobId).order('created_at'),
    ]);
    setJob(jobRes.data as JobWithVehicle | null);
    setParts(partsRes.data as JobPart[] ?? []);
    setLabour(labourRes.data as JobLabour[] ?? []);
    setPhotos(photosRes.data ?? []);
    setLoading(false);
  }

  const [photos, setPhotos] = useState<{ id: string; photo_url: string; photo_type: string }[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') {
    if (!e.target.files || !e.target.files[0] || !job) return;
    const file = e.target.files[0];
    setUploadingPhoto(true);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const max = 800;
        
        if (width > height && width > max) {
          height = Math.round((height * max) / width);
          width = max;
        } else if (height > max) {
          width = Math.round((width * max) / height);
          height = max;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6);
        
        const { data } = await supabase.from('job_photos').insert({
          job_id: job.id,
          photo_url: compressedBase64,
          photo_type: type,
        }).select('*').single();
        
        if (data) setPhotos(prev => [...prev, data]);
        setUploadingPhoto(false);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function deletePhoto(id: string) {
    await supabase.from('job_photos').delete().eq('id', id);
    setPhotos(photos.filter(p => p.id !== id));
  }

  const [aiScanning, setAiScanning] = useState(false);

  async function handleAiScan(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || !e.target.files[0] || !job) return;
    const file = e.target.files[0];
    
    let apiKey = import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('gemini_api_key');
    if (!apiKey) {
      apiKey = prompt('Please enter your Gemini API Key to use the AI Scanner:');
      if (!apiKey) return;
      localStorage.setItem('gemini_api_key', apiKey);
    }

    setAiScanning(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const img = new Image();
        img.onload = async () => {
          try {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const max = 1200; // Good enough for reading text
            
            if (width > height && width > max) {
              height = Math.round((height * max) / width);
              width = max;
            } else if (height > max) {
              width = Math.round((width * max) / height);
              height = max;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            
            // Get base64 without the data:image/jpeg;base64, prefix
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            const base64Data = dataUrl.split(',')[1];
            
            const { GoogleGenerativeAI } = await import('@google/generative-ai');
            const genAI = new GoogleGenerativeAI(apiKey!);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            
            const promptStr = "Extract all spare parts and labour charges from this handwritten invoice/bill. Return ONLY a JSON object with exactly two keys: 'parts' (array of objects with 'part_name' (string), 'quantity' (pure number), 'unit_price' (pure number, no commas)) and 'labour' (array of objects with 'description' (string) and 'amount' (pure number, no commas)). Output nothing but the raw JSON object starting with { and ending with }.";
            
            const result = await model.generateContent([
              promptStr,
              { inlineData: { data: base64Data, mimeType: 'image/jpeg' } }
            ]);
            
            const responseText = result.response.text();
            
            // Robust JSON extraction
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('No JSON object found in response');
            
            const parsed = JSON.parse(jsonMatch[0]);
            
            // Insert parts into database
            if (parsed.parts && Array.isArray(parsed.parts)) {
              for (const p of parsed.parts) {
                const { data } = await supabase.from('job_parts').insert({
                  job_id: job.id,
                  part_name: p.part_name || 'Unknown Part',
                  part_number: '',
                  quantity: Number(p.quantity) || 1,
                  unit_price: Number(p.unit_price) || 0,
                  gst_percent: 0,
                }).select('*').single();
                
                if (data) {
                   setParts(prev => [...prev, data as JobPart]);
                }
              }
            }

            // Insert labour into database
            if (parsed.labour && Array.isArray(parsed.labour)) {
              for (const l of parsed.labour) {
                const { data } = await supabase.from('job_labour').insert({
                  job_id: job.id,
                  description: l.description || 'General Labour',
                  hours: 0,
                  rate: 0,
                  fixed_amount: Number(l.amount) || 0,
                }).select('*').single();
                
                if (data) {
                   setLabour(prev => [...prev, data as JobLabour]);
                }
              }
            }
            setAiScanning(false);
          } catch (err: any) {
            console.error(err);
            alert('Failed to parse AI response: ' + (err.message || 'Unknown error'));
            setAiScanning(false);
          }
        };
        img.src = ev.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error(err);
      alert('Failed to read image: ' + (err.message || 'Unknown error'));
      setAiScanning(false);
    }
    e.target.value = '';
  }

  const [listening, setListening] = useState(false);

  async function handleVoiceCommand() {
    if (!job) return;
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support voice recognition. Please use Google Chrome.");
      return;
    }

    let apiKey = import.meta.env.VITE_GROQ_API_KEY || localStorage.getItem('groq_api_key');
    if (!apiKey) {
      apiKey = prompt('Please enter your Groq API Key to use the AI Voice features:');
      if (!apiKey) return;
      localStorage.setItem('groq_api_key', apiKey);
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    
    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setListening(false);
      setAiScanning(true);
      try {
        const OpenAI = (await import('openai')).default;
        const openai = new OpenAI({ 
          apiKey: apiKey, 
          baseURL: 'https://api.groq.com/openai/v1',
          dangerouslyAllowBrowser: true 
        });
        
        const promptStr = `Extract all spare parts and labour charges from this voice transcript: "${transcript}". Return ONLY a JSON object with exactly two keys: 'parts' (array of objects with 'part_name' (string), 'quantity' (pure number), 'unit_price' (pure number, no commas)) and 'labour' (array of objects with 'description' (string) and 'amount' (pure number, no commas)). Output nothing but the raw JSON object starting with { and ending with }.`;
        
        const response = await openai.chat.completions.create({
          model: "openai/gpt-oss-120b",
          messages: [{ role: "user", content: promptStr }]
        });
        
        const responseText = response.choices[0]?.message?.content || "";
        
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON object found in response');
        
        const parsed = JSON.parse(jsonMatch[0]);
        
        if (parsed.parts && Array.isArray(parsed.parts)) {
          for (const p of parsed.parts) {
            const { data } = await supabase.from('job_parts').insert({
              job_id: job.id,
              part_name: p.part_name || 'Unknown Part',
              part_number: '',
              quantity: Number(p.quantity) || 1,
              unit_price: Number(p.unit_price) || 0,
              gst_percent: 0,
            }).select('*').single();
            if (data) setParts(prev => [...prev, data as JobPart]);
          }
        }

        if (parsed.labour && Array.isArray(parsed.labour)) {
          for (const l of parsed.labour) {
            const { data } = await supabase.from('job_labour').insert({
              job_id: job.id,
              description: l.description || 'General Labour',
              hours: 0,
              rate: 0,
              fixed_amount: Number(l.amount) || 0,
            }).select('*').single();
            if (data) setLabour(prev => [...prev, data as JobLabour]);
          }
        }
      } catch (err: any) {
        console.error(err);
        alert('Failed to parse AI response: ' + (err.message || 'Unknown error'));
      } finally {
        setAiScanning(false);
      }
    };

    recognition.onerror = (event: any) => {
      console.error(event.error);
      setListening(false);
      alert("Voice recognition error: " + event.error);
    };

    recognition.start();
  }

  const isLocked = job?.status === 'completed';

  // Live totals
  const partsTotal = parts.reduce((sum, p) => sum + p.quantity * p.unit_price, 0);
  const labourTotal = labour.reduce((sum, l) => sum + (l.fixed_amount > 0 ? l.fixed_amount : l.hours * l.rate), 0);
  const grandTotal = partsTotal + labourTotal;

  async function updateStatus(newStatus: Job['status']) {
    if (!job || isLocked) return;
    setStatusUpdating(true);
    await supabase.from('jobs').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', job.id);
    if (newStatus === 'completed') {
      await supabase.from('jobs').update({ completed_at: new Date().toISOString() }).eq('id', job.id);
    }
    setStatusUpdating(false);
    loadJob(job.id);
  }

  async function addPart(e: FormEvent) {
    e.preventDefault();
    if (!job || !partName.trim()) return;
    const { data } = await supabase.from('job_parts').insert({
      job_id: job.id,
      part_name: partName,
      part_number: '',
      quantity: 1,
      unit_price: parseFloat(partPrice) || 0,
      gst_percent: 0,
    }).select('*').single();
    if (data) setParts([...parts, data as JobPart]);
    setPartName(''); setPartPrice('');
    setShowPartForm(false);
  }

  async function deletePart(partId: string) {
    await supabase.from('job_parts').delete().eq('id', partId);
    setParts(parts.filter((p) => p.id !== partId));
  }

  async function addLabour(e: FormEvent) {
    e.preventDefault();
    if (!job || !labourAmount) return;
    const { data } = await supabase.from('job_labour').insert({
      job_id: job.id,
      description: 'Labour Charges',
      hours: 0,
      rate: 0,
      fixed_amount: parseFloat(labourAmount) || 0,
    }).select('*').single();
    if (data) setLabour([...labour, data as JobLabour]);
    setLabourAmount('');
    setShowLabourForm(false);
  }

  async function deleteLabour(labourId: string) {
    await supabase.from('job_labour').delete().eq('id', labourId);
    setLabour(labour.filter((l) => l.id !== labourId));
  }

  function onPartNameChange(val: string) {
    setPartName(val);
    const match = catalogue.find((c) => c.part_name.toLowerCase() === val.toLowerCase());
    if (match) {
      setPartPrice(String(match.default_price));
    }
  }

  async function editKm() {
    if (isLocked || !job) return;
    const newKm = prompt("Enter current KM for this job:", String(job.km_reading));
    if (newKm && !isNaN(Number(newKm))) {
      await supabase.from('jobs').update({ km_reading: Number(newKm) }).eq('id', job.id);
      loadJob(job.id);
    }
  }

  async function createNewJob(e?: React.MouseEvent | FormEvent) {
    if (e) e.preventDefault();
    if (!job?.vehicle_id) return;
    setStatusUpdating(true);
    const { data, error } = await supabase.from('jobs').insert({
      vehicle_id: job.vehicle_id,
      complaint: 'Service',
      km_reading: job.vehicle?.current_km || 0,
      assigned_mechanic: '',
      status: 'received',
    }).select('id').single();
    if (!error && data) {
      navigate(`/app/jobs/${data.id}`);
    }
    setStatusUpdating(false);
  }

  async function completeJob() {
    if (!job) return;
    // Generate invoice number
    const year = new Date().getFullYear();
    const prefix = 'GT';
    const { data: lastInvoice } = await supabase
      .from('invoices')
      .select('invoice_number')
      .ilike('invoice_number', `${prefix}-${year}-%`)
      .order('invoice_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    let seq = 1;
    if (lastInvoice?.invoice_number) {
      const match = lastInvoice.invoice_number.match(/(\d+)$/);
      if (match) seq = parseInt(match[1]) + 1;
    }
    const invoiceNumber = `${prefix}-${year}-${String(seq).padStart(4, '0')}`;

    // Calculate totals
    const subtotal = parts.reduce((s, p) => s + p.quantity * p.unit_price, 0) + labour.reduce((s, l) => s + (l.fixed_amount > 0 ? l.fixed_amount : l.hours * l.rate), 0);
    const gstTotal = 0;
    const grandTotal = subtotal;

    // Create invoice
    const { data: invoice, error: invErr } = await supabase.from('invoices').insert({
      job_id: job.id,
      invoice_number: invoiceNumber,
      subtotal,
      discount: 0,
      gst_total: gstTotal,
      grand_total: grandTotal,
      payment_status: 'unpaid',
      payment_mode: '',
    }).select('*').single();

    if (invErr) {
      setShowComplete(false);
      return;
    }

    // Lock the job
    await supabase.from('jobs').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', job.id);

    // Update next service reminder if provided
    const win = window as { nextDate?: string; nextKm?: string } & Window;
    const nextDate = win.nextDate;
    const nextKm = win.nextKm;
    if (nextDate || nextKm) {
      await supabase.from('vehicles').update({
        next_service_date: nextDate || null,
        next_service_km: nextKm ? parseInt(nextKm) : null,
      }).eq('id', job.vehicle_id);
    }

    setShowComplete(false);
    navigate(`/app/invoices/${(invoice as Invoice).id}`);
  }

  if (loading) {
    return <div className="space-y-3">
      <div className="h-8 w-48 animate-pulse rounded bg-graphite-100 dark:bg-graphite-800" />
      <div className="h-64 animate-pulse rounded-2xl bg-graphite-100 dark:bg-graphite-800" />
    </div>;
  }

  if (!job) {
    return <div className="card text-center py-10">
      <p className="text-sm text-graphite-500">Job not found</p>
      <Link to="/app/jobs" className="btn-primary mt-4">Back to jobs</Link>
    </div>;
  }

  const statusSteps: Job['status'][] = ['received', 'in_progress', 'ready', 'completed'];
  const currentStep = statusSteps.indexOf(job.status);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link to="/app/jobs" className="inline-flex items-center gap-1 text-sm text-graphite-500 hover:text-graphite-900 dark:hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to jobs
      </Link>

      {/* Job header */}
      <div className="card space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-graphite-900 dark:text-white">{job.complaint}</h2>
            <p className="text-sm font-medium text-graphite-500 mt-1">
              {job.vehicle?.make} {job.vehicle?.model} · <span className="font-semibold text-graphite-700 dark:text-graphite-300">{maskPlate(job.vehicle?.number_plate ?? '')}</span> · {job.vehicle?.customer?.name}
            </p>
          </div>
          {isLocked && (
            <div className="flex items-center gap-1.5 rounded-xl bg-signal-green/10 px-3 py-1.5 text-xs font-semibold text-signal-green">
              <Lock className="h-3.5 w-3.5" /> Completed
            </div>
          )}
        </div>

        {/* Current KM Reading Block */}
        <div className="rounded-xl border border-graphite-200 bg-graphite-50/80 p-3.5 dark:border-graphite-700 dark:bg-graphite-800/60 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-500/10 text-accent-600 dark:text-accent-400">
              <Gauge className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xs font-bold uppercase tracking-wider text-graphite-500 dark:text-graphite-400">Current KM Reading</p>
              {!isLocked ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    className="input-field py-1.5 px-3 text-base font-bold tabular-nums w-40 bg-white dark:bg-graphite-900 border-accent-500/30 focus:border-accent-500"
                    placeholder="Enter current KM"
                    defaultValue={job.km_reading}
                    onBlur={async (e) => {
                      const val = Number(e.target.value);
                      if (!isNaN(val) && val !== job.km_reading) {
                        await supabase.from('jobs').update({ km_reading: val }).eq('id', job.id);
                        if (job.vehicle_id) {
                          await supabase.from('vehicles').update({ current_km: val }).eq('id', job.vehicle_id);
                        }
                        loadJob(job.id);
                      }
                    }}
                  />
                  <span className="text-sm font-bold text-graphite-500">KM</span>
                </div>
              ) : (
                <p className="text-base font-bold text-graphite-900 dark:text-white mt-1">
                  {job.km_reading.toLocaleString('en-IN')} <span className="text-sm font-normal text-graphite-500">KM</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-graphite-500 font-medium">
            <span>📅 Date: {formatDate(job.job_date)}</span>
          </div>
        </div>
      </div>

      {/* Parts section */}
      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-graphite-500">
            <Package className="h-4 w-4" /> Spare Parts
          </h3>
          {!isLocked && !showPartForm && (
            <div className="flex gap-2">
              <button 
                onClick={handleVoiceCommand} 
                disabled={listening || aiScanning}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${listening ? 'bg-signal-red/10 border-signal-red/20 text-signal-red animate-pulse' : 'bg-transparent border-graphite-200 text-graphite-700 hover:bg-graphite-50 dark:border-graphite-700 dark:text-graphite-300 dark:hover:bg-graphite-800'}`}
              >
                <Mic className="h-4 w-4" /> {listening ? 'Listening...' : 'Voice Input'}
              </button>
              <label className="btn-secondary text-xs cursor-pointer">
                {aiScanning ? 'Scanning...' : '✨ AI Scan Bill'}
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleAiScan} disabled={aiScanning || listening} />
              </label>
              <button onClick={() => setShowPartForm(true)} className="btn-ghost text-xs">
                <Plus className="h-4 w-4" /> Add part
              </button>
            </div>
          )}
        </div>

        {showPartForm && (
          <form onSubmit={addPart} className="mb-3 space-y-2 rounded-xl bg-graphite-50 p-3 dark:bg-graphite-800">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <input className="input-field text-sm" list="parts-list" value={partName} onChange={(e) => onPartNameChange(e.target.value)} placeholder="Part name" required />
                <datalist id="parts-list">
                  {catalogue.map((c, i) => <option key={i} value={c.part_name} />)}
                </datalist>
              </div>
              <input className="input-field text-sm" type="number" step="0.01" value={partPrice} onChange={(e) => setPartPrice(e.target.value)} placeholder="Amount ₹" required />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary text-xs flex-1">Add</button>
              <button type="button" onClick={() => setShowPartForm(false)} className="btn-ghost text-xs">Cancel</button>
            </div>
          </form>
        )}

        {parts.length === 0 ? (
          <p className="text-sm text-graphite-400 py-3 text-center">No parts added yet</p>
        ) : (
          <div className="space-y-1.5">
            {parts.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-graphite-100 px-3 py-2.5 dark:border-graphite-800">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-graphite-900 dark:text-white">{p.part_name}</p>
                  <p className="text-xs text-graphite-500">
                    {p.part_number && `#${p.part_number} · `}{p.quantity} × {formatINR(p.unit_price)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-bold tabular-nums text-graphite-900 dark:text-white">{formatINR(p.quantity * p.unit_price)}</p>
                  {!isLocked && <button onClick={() => deletePart(p.id)} className="text-graphite-300 hover:text-signal-red"><Trash2 className="h-4 w-4" /></button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Labour section */}
      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-graphite-500">
            <Clock className="h-4 w-4" /> Labour
          </h3>
          {!isLocked && !showLabourForm && (
            <button onClick={() => setShowLabourForm(true)} className="btn-ghost text-xs">
              <Plus className="h-4 w-4" /> Add labour
            </button>
          )}
        </div>

        {showLabourForm && (
          <form onSubmit={addLabour} className="mb-3 space-y-2 rounded-xl bg-graphite-50 p-3 dark:bg-graphite-800">
            <input className="input-field text-sm" type="number" step="0.01" value={labourAmount} onChange={(e) => setLabourAmount(e.target.value)} placeholder="Amount ₹" required />
            <div className="flex gap-2">
              <button type="submit" className="btn-primary text-xs flex-1">Add</button>
              <button type="button" onClick={() => setShowLabourForm(false)} className="btn-ghost text-xs">Cancel</button>
            </div>
          </form>
        )}

        {labour.length === 0 ? (
          <p className="text-sm text-graphite-400 py-3 text-center">No labour added yet</p>
        ) : (
          <div className="space-y-1.5">
            {labour.map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-xl border border-graphite-100 px-3 py-2.5 dark:border-graphite-800">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-graphite-900 dark:text-white">{l.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-bold tabular-nums text-graphite-900 dark:text-white">{formatINR(l.fixed_amount > 0 ? l.fixed_amount : l.hours * l.rate)}</p>
                  {!isLocked && <button onClick={() => deleteLabour(l.id)} className="text-graphite-300 hover:text-signal-red"><Trash2 className="h-4 w-4" /></button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>



      {/* Running total */}
      <div className="card bg-graphite-900 text-white dark:bg-graphite-800">
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-graphite-300">
            <span>Parts</span>
            <span className="tabular-nums">{formatINR(partsTotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-graphite-300">
            <span>Labour</span>
            <span className="tabular-nums">{formatINR(labourTotal)}</span>
          </div>
          <div className="border-t border-graphite-700 pt-2 flex justify-between text-base font-bold">
            <span>Total</span>
            <span className="tabular-nums">{formatINR(grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Complete job button */}
      {!isLocked && (
        <div className="sticky bottom-20 lg:bottom-4">
          <button
            onClick={() => setShowComplete(true)}
            disabled={parts.length === 0 && labour.length === 0}
            className="btn-primary w-full shadow-lg shadow-accent-500/30"
          >
            <CheckCircle2 className="h-5 w-5" /> OK – Complete Job & Create Invoice
          </button>
        </div>
      )}

      {/* New job for same vehicle */}
      {isLocked && (
        <div className="card text-center">
          <p className="text-sm text-graphite-500 mb-3">This job is completed and locked.</p>
          <button onClick={createNewJob} className="btn-secondary w-full" disabled={statusUpdating}>
            <Plus className="h-4 w-4" /> Create New Job Card
          </button>
        </div>
      )}

      {/* Complete confirmation dialog */}
      {showComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in" onClick={() => setShowComplete(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-graphite-900 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-signal-amber/10">
                <AlertTriangle className="h-7 w-7 text-signal-amber" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-graphite-900 dark:text-white">Complete this job?</h3>
              <p className="mt-2 text-sm text-graphite-500">
                Once completed, the job will be locked. An invoice will be generated automatically and the service will appear on the customer's QR page.
              </p>
              <div className="mt-4 w-full rounded-xl bg-graphite-50 p-3 dark:bg-graphite-800">
                <div className="flex justify-between text-sm">
                  <span className="text-graphite-500">Invoice total</span>
                  <span className="font-bold tabular-nums text-graphite-900 dark:text-white">{formatINR(grandTotal)}</span>
                </div>
              </div>
              <div className="mt-4 w-full text-left space-y-3">
                <p className="text-xs font-bold uppercase tracking-wide text-graphite-500">Next Service Reminder (Optional)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="input-label text-xs">Next date</label>
                    <input className="input-field text-sm" type="date" defaultValue={(window as { nextDate?: string } & Window).nextDate || ''} onChange={(e) => ((window as { nextDate?: string } & Window).nextDate = e.target.value)} />
                  </div>
                  <div>
                    <label className="input-label text-xs">Next km</label>
                    <input className="input-field text-sm" type="number" placeholder="e.g. 50000" defaultValue={(window as { nextKm?: string } & Window).nextKm || ''} onChange={(e) => ((window as { nextKm?: string } & Window).nextKm = e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="mt-5 flex w-full gap-2">
                <button onClick={() => setShowComplete(false)} className="btn-ghost flex-1">Cancel</button>
                <button onClick={completeJob} className="btn-primary flex-1">
                  <CheckCircle2 className="h-4 w-4" /> Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const stepColors: Record<string, { active: string }> = {
  received: { active: 'bg-graphite-200 text-graphite-700 dark:bg-graphite-700 dark:text-white' },
  in_progress: { active: 'bg-signal-amber/20 text-signal-amber' },
  ready: { active: 'bg-accent-500/20 text-accent-600 dark:text-accent-400' },
  completed: { active: 'bg-signal-green/20 text-signal-green' },
};
