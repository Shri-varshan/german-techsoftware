import { useEffect, useState, type FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Package, Clock, CheckCircle2, AlertTriangle, Lock, Mic, Gauge, Sparkles, X, FileText, Check, ClipboardList, Edit3, AlertCircle } from 'lucide-react';
import { supabase, type Job, type JobPart, type JobLabour, type Vehicle, type Invoice } from '@/lib/supabase';
import { formatINR, formatDate, maskPlate } from '@/lib/constants';
import { getCached, setCached, invalidateCache } from '@/lib/cache';

interface ScannedPartItem {
  part_name: string;
  quantity: number;
  unit_price: number;
}

interface ScannedLabourItem {
  description: string;
  amount: number;
}

interface JobWithVehicle extends Job {
  vehicle?: Vehicle & { customer?: { name: string; phone: string } };
}

export default function JobDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobWithVehicle | null>(() => (id ? getCached<JobWithVehicle>(`job_${id}`) : null));
  const [parts, setParts] = useState<JobPart[]>(() => (id ? getCached<JobPart[]>(`job_parts_${id}`) ?? [] : []));
  const [labour, setLabour] = useState<JobLabour[]>(() => (id ? getCached<JobLabour[]>(`job_labour_${id}`) ?? [] : []));
  const [loading, setLoading] = useState(() => !(id && getCached(`job_${id}`)));
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

  // Customer complaint edit state
  const [complaintText, setComplaintText] = useState('');
  const [editingComplaint, setEditingComplaint] = useState(false);
  const [savingComplaint, setSavingComplaint] = useState(false);
  const [listeningComplaint, setListeningComplaint] = useState(false);

  function handleComplaintVoice() {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support voice recognition. Please use Google Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;

    recognition.onstart = () => {
      setListeningComplaint(true);
      setEditingComplaint(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      setListeningComplaint(false);
      if (transcript && transcript.trim()) {
        const spoken = transcript.trim();
        setComplaintText((prev) => {
          if (!prev || !prev.trim()) return spoken;
          return `${prev.trim()}\n• ${spoken}`;
        });
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setListeningComplaint(false);
      if (event.error !== 'no-speech') {
        alert("Voice recognition error: " + event.error);
      }
    };

    recognition.onend = () => {
      setListeningComplaint(false);
    };

    recognition.start();
  }

  async function saveComplaint() {
    if (!job) return;
    setSavingComplaint(true);
    try {
      const trimmed = complaintText.trim();
      const { error } = await supabase.from('jobs').update({ complaint: trimmed }).eq('id', job.id);
      if (error) throw error;
      const updatedJob = { ...job, complaint: trimmed };
      setJob(updatedJob);
      setCached(`job_${job.id}`, updatedJob);
      setEditingComplaint(false);
    } catch (err: any) {
      alert('Failed to save complaint: ' + (err.message || 'Unknown error'));
    } finally {
      setSavingComplaint(false);
    }
  }

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
    if (!getCached(`job_${jobId}`)) {
      setLoading(true);
    }
    const [jobRes, partsRes, labourRes, photosRes] = await Promise.all([
      supabase.from('jobs').select('*, vehicle:vehicles(*, customer:customers(*))').eq('id', jobId).maybeSingle(),
      supabase.from('job_parts').select('*').eq('job_id', jobId).order('created_at'),
      supabase.from('job_labour').select('*').eq('job_id', jobId).order('created_at'),
      supabase.from('job_photos').select('*').eq('job_id', jobId).order('created_at'),
    ]);
    const j = jobRes.data as JobWithVehicle | null;
    const p = (partsRes.data as JobPart[]) ?? [];
    const l = (labourRes.data as JobLabour[]) ?? [];
    setJob(j);
    if (j) {
      setComplaintText(j.complaint || '');
      setCached(`job_${jobId}`, j);
      setCached(`job_parts_${jobId}`, p);
      setCached(`job_labour_${jobId}`, l);
    }
    setParts(p);
    setLabour(l);
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
  const [scanStepMessage, setScanStepMessage] = useState('');
  const [showScanModal, setShowScanModal] = useState(false);
  const [scannedParts, setScannedParts] = useState<ScannedPartItem[]>([]);
  const [scannedLabour, setScannedLabour] = useState<ScannedLabourItem[]>([]);
  const [scannedImagePreview, setScannedImagePreview] = useState<string>('');
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [savingScanned, setSavingScanned] = useState(false);

  async function handleAiScan(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || !e.target.files[0] || !job) return;
    const file = e.target.files[0];
    let groqKey = import.meta.env.VITE_GROQ_API_KEY || localStorage.getItem('groq_api_key') || localStorage.getItem('gt-groq-key');
    if (!groqKey) {
      const entered = prompt('Please enter your Groq API Key to enable AI Vision bill scanning:');
      if (!entered) return;
      localStorage.setItem('groq_api_key', entered.trim());
      groqKey = entered.trim();
    }

    setAiScanning(true);
    setScanStepMessage('Processing bill photo...');

    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const img = new Image();
        img.onload = async () => {
          try {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const max = 1800;
            
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
            if (!ctx) throw new Error('Failed to create canvas context');
            ctx.drawImage(img, 0, 0, width, height);
            
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            setScanStepMessage('AI reading handwritten items & prices...');

            const systemPrompt = `You are an expert automotive workshop AI assistant specializing in accurately reading handwritten garage bills, repair orders, parts estimates, job cards, and mechanic invoices.

Carefully examine all handwritten text, columns, abbreviations, quantities, and prices in the image.

Output ONLY a valid JSON object matching this schema:
{
  "parts": [
    { "part_name": "Full name of the spare part or material", "quantity": 1, "unit_price": 450 }
  ],
  "labour": [
    { "description": "Description of the labour/service work", "amount": 500 }
  ]
}

Important guidelines for handwritten automotive bills:
1. Distinguish between physical spare parts (engine oil, brake oil, coolant, oil filter, air filter, brake pads, wiper blades, spark plugs, belts, bearings, bulbs, bushes, fluids) and labour charges (service charge, labour, fitting, lathe work, disc facing, tinkering, painting, electrical repair, wash/cleaning, diagnosis).
2. Many handwritten bills use abbreviations or mechanic shorthand. Expand them cleanly (e.g. 'eng oil' -> 'Engine Oil', 'brk pad' -> 'Brake Pads', 'o/f' or 'oil fltr' -> 'Oil Filter', 'shox' -> 'Shock Absorber', 'alnmt' -> 'Wheel Alignment', 'disc turn' -> 'Brake Disc Skimming').
3. For handwritten quantities, if not mentioned, default to 1.
4. All unit_price and amount values MUST be numbers only (strip any currency symbols like ₹, Rs, commas, or words).
5. If nothing is found or the image is unrelated, return { "parts": [], "labour": [] }.
6. Output raw JSON only starting with { and ending with }.`;

            const userPrompt = "Read all handwritten spare parts and labour entries from this bill image. Return JSON only.";

            // Multimodal Vision call using Groq
            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${groqKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: 'qwen/qwen3.8-27b',
                messages: [
                  {
                    role: 'system',
                    content: systemPrompt
                  },
                  {
                    role: 'user',
                    content: [
                      { type: 'text', text: userPrompt },
                      { type: 'image_url', image_url: { url: dataUrl } }
                    ]
                  }
                ],
                response_format: { type: 'json_object' }
              })
            });

            if (!res.ok) {
              const errBody = await res.json().catch(() => ({}));
              throw new Error(errBody?.error?.message || `AI error (${res.status})`);
            }

            const groqRes = await res.json();
            const responseText = groqRes.choices?.[0]?.message?.content || '{}';
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('No valid JSON extracted from bill');
            const parsed = JSON.parse(jsonMatch[0]);
            
            const rawParts = Array.isArray(parsed.parts) ? parsed.parts : [];
            const rawLabour = Array.isArray(parsed.labour) ? parsed.labour : [];

            const extractedParts: ScannedPartItem[] = rawParts.map((p: any) => ({
              part_name: String(p.part_name || '').trim(),
              quantity: Math.max(1, Number(p.quantity) || 1),
              unit_price: Math.max(0, Number(p.unit_price) || 0),
            })).filter((p: any) => p.part_name && p.unit_price > 0);

            const extractedLabour: ScannedLabourItem[] = rawLabour.map((l: any) => ({
              description: String(l.description || '').trim(),
              amount: Math.max(0, Number(l.amount) || 0),
            })).filter((l: any) => l.description && l.amount > 0);

            if (extractedParts.length === 0 && extractedLabour.length === 0) {
              alert('No parts or labour items could be recognized in this image. Please ensure the bill is well-lit, clearly legible, and shows part names and prices.');
              setAiScanning(false);
              return;
            }

            setScannedParts(extractedParts);
            setScannedLabour(extractedLabour);
            setScannedImagePreview(dataUrl);
            setShowScanModal(true);
            setAiScanning(false);
          } catch (err: any) {
            console.error('AI Scan error:', err);
            alert('Failed to parse bill with AI: ' + (err.message || 'Unknown error'));
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

  async function confirmScannedItems() {
    if (!job) return;
    setSavingScanned(true);
    try {
      const addedParts: JobPart[] = [];
      for (const p of scannedParts) {
        if (!p.part_name.trim() || p.unit_price <= 0) continue;
        const cat = catalogue.find(c => c.part_name.toLowerCase() === p.part_name.trim().toLowerCase());
        const { data } = await supabase.from('job_parts').insert({
          job_id: job.id,
          part_name: p.part_name.trim(),
          part_number: cat?.part_number || '',
          quantity: p.quantity || 1,
          unit_price: p.unit_price || 0,
          gst_percent: cat?.default_gst || 0,
        }).select('*').single();
        if (data) addedParts.push(data as JobPart);
      }

      const addedLabour: JobLabour[] = [];
      for (const l of scannedLabour) {
        if (!l.description.trim() || l.amount <= 0) continue;
        const { data } = await supabase.from('job_labour').insert({
          job_id: job.id,
          description: l.description.trim(),
          hours: 0,
          rate: 0,
          fixed_amount: l.amount || 0,
        }).select('*').single();
        if (data) addedLabour.push(data as JobLabour);
      }

      if (addedParts.length > 0) {
        const nextParts = [...parts, ...addedParts];
        setParts(nextParts);
        setCached(`job_parts_${job.id}`, nextParts);
      }
      if (addedLabour.length > 0) {
        const nextLabour = [...labour, ...addedLabour];
        setLabour(nextLabour);
        setCached(`job_labour_${job.id}`, nextLabour);
      }

      setShowScanModal(false);
      setScannedParts([]);
      setScannedLabour([]);
      setScannedImagePreview('');
    } catch (err: any) {
      console.error('Save error:', err);
      alert('Error saving scanned items: ' + (err.message || 'Unknown error'));
    } finally {
      setSavingScanned(false);
    }
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

    invalidateCache('jobs');
    invalidateCache('dashboard');
    invalidateCache('invoices');
    invalidateCache('reports');
    invalidateCache(`job_${job.id}`);

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

      {/* Customer Complaint / Reported Issues section */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-accent-500" />
            <h3 className="text-sm font-bold uppercase tracking-wide text-graphite-700 dark:text-graphite-300">
              Customer Complaint / Reported Issues
            </h3>
          </div>
          {!isLocked && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleComplaintVoice}
                disabled={listeningComplaint}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  listeningComplaint
                    ? 'bg-signal-red/10 border-signal-red/30 text-signal-red animate-pulse'
                    : 'bg-transparent border-graphite-200 dark:border-graphite-700 text-graphite-700 dark:text-graphite-300 hover:bg-graphite-50 dark:hover:bg-graphite-800'
                }`}
                title="Speak customer complaints"
              >
                <Mic className={`h-3.5 w-3.5 ${listeningComplaint ? 'text-signal-red' : 'text-accent-500'}`} />
                {listeningComplaint ? 'Listening...' : 'Voice Input'}
              </button>

              {!editingComplaint && (
                <button
                  type="button"
                  onClick={() => {
                    setComplaintText(job.complaint || '');
                    setEditingComplaint(true);
                  }}
                  className="btn-ghost text-xs flex items-center gap-1.5"
                >
                  <Edit3 className="h-3.5 w-3.5 text-accent-500" /> {job.complaint && job.complaint.trim() ? 'Edit Issues' : '+ Add Complaint'}
                </button>
              )}
            </div>
          )}
        </div>

        {editingComplaint && !isLocked ? (
          <div className="space-y-3 pt-1">
            <textarea
              className="input-field text-sm w-full min-h-[90px] p-3 resize-y font-normal"
              placeholder="e.g. 1. Brake vibration at high speed&#10;2. Periodic maintenance service&#10;3. Suspension noise over bumps..."
              value={complaintText}
              onChange={(e) => setComplaintText(e.target.value)}
              autoFocus
            />

            {/* Quick suggestion tags */}
            <div className="flex flex-wrap items-center gap-1.5 text-2xs">
              <span className="text-graphite-400 font-semibold uppercase">Quick tags:</span>
              {[
                'Periodic Service',
                'Brake Pad Noise',
                'Oil & Filter Replacement',
                'Suspension Check',
                'AC Low Cooling',
                'Wheel Alignment & Balancing',
                'Engine Warning Light',
                'General Inspection'
              ].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    const current = complaintText.trim();
                    if (!current) {
                      setComplaintText(tag);
                    } else if (!current.includes(tag)) {
                      setComplaintText(`${current}, ${tag}`);
                    }
                  }}
                  className="rounded-lg bg-graphite-100 hover:bg-graphite-200 dark:bg-graphite-800 dark:hover:bg-graphite-700 text-graphite-700 dark:text-graphite-300 px-2.5 py-1 font-medium transition-colors"
                >
                  + {tag}
                </button>
              ))}
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => setEditingComplaint(false)}
                disabled={savingComplaint}
                className="btn-ghost text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveComplaint}
                disabled={savingComplaint}
                className="btn-primary text-xs"
              >
                <Check className="h-4 w-4" /> {savingComplaint ? 'Saving...' : 'Save Issues'}
              </button>
            </div>
          </div>
        ) : (
          <div 
            onClick={() => {
              if (!isLocked) {
                setComplaintText(job.complaint || '');
                setEditingComplaint(true);
              }
            }}
            className={`rounded-xl border p-3.5 transition-all ${
              !isLocked ? 'cursor-pointer hover:border-accent-500/40 hover:bg-graphite-50/60 dark:hover:bg-graphite-800/40' : ''
            } border-graphite-100 bg-graphite-50/50 dark:border-graphite-800 dark:bg-graphite-800/30`}
          >
            {job.complaint && job.complaint.trim() ? (
              <p className="text-sm font-medium text-graphite-900 dark:text-white whitespace-pre-line leading-relaxed">
                {job.complaint}
              </p>
            ) : (
              <div className="flex items-center justify-between text-graphite-400 py-1 text-xs">
                <span>No specific complaints recorded yet. Click to record issues reported by customer.</span>
                {!isLocked && <span className="text-accent-500 font-semibold">+ Add</span>}
              </div>
            )}
          </div>
        )}
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
              <label className={`btn-secondary text-xs cursor-pointer flex items-center gap-1.5 ${aiScanning ? 'opacity-80 pointer-events-none' : ''}`}>
                <Sparkles className={`h-3.5 w-3.5 text-accent-500 ${aiScanning ? 'animate-spin' : ''}`} />
                {aiScanning ? (scanStepMessage || 'Reading Bill...') : 'AI Scan Bill'}
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

      {/* Floating AI Scanning indicator */}
      {aiScanning && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-full bg-graphite-900/95 text-white px-5 py-3 shadow-2xl backdrop-blur-md border border-graphite-700 animate-slide-up">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-accent-400" />
          <span className="text-xs font-semibold">{scanStepMessage || 'Reading handwritten bill with AI Vision...'}</span>
        </div>
      )}

      {/* Scanned items review modal */}
      {showScanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in" onClick={() => !savingScanned && setShowScanModal(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl dark:bg-graphite-900 border border-graphite-200 dark:border-graphite-800 max-h-[90vh] flex flex-col animate-scale-in" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-graphite-100 dark:border-graphite-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-500/10 text-accent-500">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-graphite-900 dark:text-white">Review Scanned Bill</h3>
                  <p className="text-2xs text-graphite-500">Handwritten bill parsed by AI Vision. Verify or adjust details.</p>
                </div>
              </div>
              <button onClick={() => setShowScanModal(false)} disabled={savingScanned} className="text-graphite-400 hover:text-graphite-600 dark:hover:text-graphite-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1">
              {/* Image preview toggle */}
              {scannedImagePreview && (
                <div className="rounded-xl border border-graphite-100 dark:border-graphite-800 overflow-hidden bg-graphite-50 dark:bg-graphite-800/40 p-2.5">
                  <button 
                    type="button" 
                    onClick={() => setShowImagePreview(!showImagePreview)}
                    className="flex items-center justify-between w-full text-xs font-semibold text-graphite-600 dark:text-graphite-300"
                  >
                    <span className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-graphite-400" /> Scanned Bill Photo
                    </span>
                    <span className="text-2xs font-bold text-accent-500 hover:underline">{showImagePreview ? 'Hide Photo ▲' : 'Show Photo ▼'}</span>
                  </button>
                  {showImagePreview && (
                    <div className="mt-2 max-h-56 overflow-auto rounded-lg border border-graphite-200 dark:border-graphite-700 bg-black/90 flex justify-center p-1">
                      <img src={scannedImagePreview} alt="Scanned Bill" className="max-h-52 object-contain rounded" />
                    </div>
                  )}
                </div>
              )}

              {/* Spare parts */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-graphite-500 flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5" /> Spare Parts ({scannedParts.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setScannedParts([...scannedParts, { part_name: '', quantity: 1, unit_price: 0 }])}
                    className="text-xs font-semibold text-accent-500 hover:text-accent-600 flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Part
                  </button>
                </div>

                {scannedParts.length === 0 ? (
                  <p className="text-xs text-graphite-400 py-2.5 text-center bg-graphite-50 dark:bg-graphite-800/40 rounded-xl">No spare parts detected</p>
                ) : (
                  <div className="space-y-2">
                    {scannedParts.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-2 rounded-xl bg-graphite-50 p-2 dark:bg-graphite-800/60 border border-graphite-100 dark:border-graphite-700">
                        <input
                          type="text"
                          value={p.part_name}
                          onChange={(e) => {
                            const next = [...scannedParts];
                            next[idx].part_name = e.target.value;
                            setScannedParts(next);
                          }}
                          placeholder="Part name"
                          className="input-field text-xs flex-1 py-1 px-2.5"
                        />
                        <div className="w-16">
                          <input
                            type="number"
                            min="1"
                            value={p.quantity}
                            onChange={(e) => {
                              const next = [...scannedParts];
                              next[idx].quantity = Math.max(1, Number(e.target.value) || 1);
                              setScannedParts(next);
                            }}
                            placeholder="Qty"
                            className="input-field text-xs text-center py-1 px-1"
                          />
                        </div>
                        <div className="w-24">
                          <input
                            type="number"
                            step="0.01"
                            value={p.unit_price}
                            onChange={(e) => {
                              const next = [...scannedParts];
                              next[idx].unit_price = Math.max(0, Number(e.target.value) || 0);
                              setScannedParts(next);
                            }}
                            placeholder="₹ Rate"
                            className="input-field text-xs py-1 px-2"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setScannedParts(scannedParts.filter((_, i) => i !== idx))}
                          className="text-graphite-400 hover:text-signal-red p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Labour section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-graphite-500 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> Labour / Services ({scannedLabour.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setScannedLabour([...scannedLabour, { description: '', amount: 0 }])}
                    className="text-xs font-semibold text-accent-500 hover:text-accent-600 flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Labour
                  </button>
                </div>

                {scannedLabour.length === 0 ? (
                  <p className="text-xs text-graphite-400 py-2.5 text-center bg-graphite-50 dark:bg-graphite-800/40 rounded-xl">No labour charges detected</p>
                ) : (
                  <div className="space-y-2">
                    {scannedLabour.map((l, idx) => (
                      <div key={idx} className="flex items-center gap-2 rounded-xl bg-graphite-50 p-2 dark:bg-graphite-800/60 border border-graphite-100 dark:border-graphite-700">
                        <input
                          type="text"
                          value={l.description}
                          onChange={(e) => {
                            const next = [...scannedLabour];
                            next[idx].description = e.target.value;
                            setScannedLabour(next);
                          }}
                          placeholder="Labour description"
                          className="input-field text-xs flex-1 py-1 px-2.5"
                        />
                        <div className="w-28">
                          <input
                            type="number"
                            step="0.01"
                            value={l.amount}
                            onChange={(e) => {
                              const next = [...scannedLabour];
                              next[idx].amount = Math.max(0, Number(e.target.value) || 0);
                              setScannedLabour(next);
                            }}
                            placeholder="₹ Amount"
                            className="input-field text-xs py-1 px-2"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setScannedLabour(scannedLabour.filter((_, i) => i !== idx))}
                          className="text-graphite-400 hover:text-signal-red p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-graphite-100 dark:border-graphite-800 space-y-3">
              <div className="flex justify-between items-center text-sm px-1">
                <span className="text-graphite-500 font-medium">Scanned Total</span>
                <span className="font-bold text-graphite-900 dark:text-white tabular-nums">
                  {formatINR(
                    scannedParts.reduce((sum, p) => sum + (p.quantity * p.unit_price), 0) +
                    scannedLabour.reduce((sum, l) => sum + l.amount, 0)
                  )}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowScanModal(false)}
                  disabled={savingScanned}
                  className="btn-ghost flex-1 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmScannedItems}
                  disabled={savingScanned || (scannedParts.length === 0 && scannedLabour.length === 0)}
                  className="btn-primary flex-1 text-xs shadow-md shadow-accent-500/20"
                >
                  <Check className="h-4 w-4" /> {savingScanned ? 'Adding...' : 'Add All to Job Card'}
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
