import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Car, ChevronRight, AlertCircle } from 'lucide-react';
import { supabase, type Vehicle } from '@/lib/supabase';
import { CAR_MAKES, CAR_MODELS, FUEL_TYPES, COLOURS, formatPlate, generatePublicToken } from '@/lib/constants';
import { invalidateCache } from '@/lib/cache';

export default function RegisterVehicleScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'customer' | 'vehicle'>('customer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Customer fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  // Vehicle fields
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));
  const [numberPlate, setNumberPlate] = useState('');
  const [vin, setVin] = useState('');
  const [colour, setColour] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [currentKm, setCurrentKm] = useState('');

  function handleCustomerNext(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError('Name and phone are required');
      return;
    }
    setError(null);
    setStep('vehicle');
  }

  async function handleVehicleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const plate = formatPlate(numberPlate);

    // Check for existing plate
    const { data: existing } = await supabase
      .from('vehicles')
      .select('id')
      .ilike('number_plate', plate)
      .maybeSingle();

    if (existing) {
      setError('A car with this plate already exists. Opening existing record…');
      setTimeout(() => navigate(`/app/vehicles/${existing.id}`), 1500);
      setLoading(false);
      return;
    }

    // Find or create customer
    let customerId: string;
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();

    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      const { data: newCustomer, error: custErr } = await supabase
        .from('customers')
        .insert({ name, phone, email, address })
        .select('id')
        .single();
      if (custErr) {
        setError(custErr.message);
        setLoading(false);
        return;
      }
      customerId = newCustomer.id;
    }

    // Create vehicle with public_token
    const { data: vehicle, error: vehErr } = await supabase
      .from('vehicles')
      .insert({
        customer_id: customerId,
        make,
        model,
        year: parseInt(year) || null,
        number_plate: plate,
        vin,
        colour,
        fuel_type: fuelType,
        current_km: parseInt(currentKm) || 0,
        public_token: generatePublicToken(),
      })
      .select('*')
      .single();

    if (vehErr) {
      setError(vehErr.message);
      setLoading(false);
      return;
    }

    invalidateCache('vehicles');
    invalidateCache('dashboard');
    invalidateCache('customers');

    setLoading(false);
    navigate(`/app/vehicles/${vehicle.id}?qr=1`);
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-4">
        <StepIndicator current={step === 'customer'} done={step === 'vehicle'} label="Customer" icon={User} />
        <div className="flex-1 border-t-2 border-dashed border-graphite-200 dark:border-graphite-700" />
        <StepIndicator current={step === 'vehicle'} done={false} label="Vehicle" icon={Car} />
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-signal-amber/10 p-3 text-sm text-signal-amber">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {step === 'customer' && (
        <form onSubmit={handleCustomerNext} className="card space-y-4">
          <h2 className="text-lg font-bold text-graphite-900 dark:text-white">Customer details</h2>
          <div>
            <label className="input-label">Full name *</label>
            <input 
              className="input-field" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Customer name" 
              pattern="[A-Za-z\s]+"
              title="Name must contain only alphabets and spaces"
              required 
            />
          </div>
          <div>
            <label className="input-label">Phone (10 digits) *</label>
            <input 
              className="input-field" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)} 
              placeholder="9840012345"
              pattern="\d{10}"
              maxLength={10}
              title="Phone number must be exactly 10 digits"
              required 
            />
          </div>
          <button type="submit" className="btn-primary w-full">
            Next: Vehicle details <ChevronRight className="h-4 w-4" />
          </button>
        </form>
      )}

      {step === 'vehicle' && (
        <form onSubmit={handleVehicleSubmit} className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-graphite-900 dark:text-white">Vehicle details</h2>
            <button type="button" onClick={() => setStep('customer')} className="btn-ghost text-xs">
              Back
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Make *</label>
              <input 
                className="input-field" 
                list="makes-list" 
                value={make} 
                onChange={(e) => { setMake(e.target.value); setModel(''); }} 
                placeholder="Select or type" 
                required 
              />
              <datalist id="makes-list">
                {CAR_MAKES.map((m) => <option key={m} value={m} />)}
              </datalist>
            </div>
            <div>
              <label className="input-label">Model *</label>
              <input 
                className="input-field" 
                list="models-list" 
                value={model} 
                onChange={(e) => setModel(e.target.value)} 
                placeholder="Select or type" 
                required 
              />
              <datalist id="models-list">
                {make && CAR_MODELS[make]?.map((m) => <option key={m} value={m} />)}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Year</label>
              <input className="input-field" type="number" value={year} onChange={(e) => setYear(e.target.value)} min="1990" max="2030" />
            </div>
            <div>
              <label className="input-label">Number plate *</label>
              <input
                className="input-field uppercase"
                value={numberPlate}
                onChange={(e) => setNumberPlate(e.target.value.toUpperCase())}
                placeholder="TN 09 BT 1234"
                required
              />
            </div>
          </div>

          <div>
            <label className="input-label">VIN (optional)</label>
            <input className="input-field" value={vin} onChange={(e) => setVin(e.target.value)} placeholder="17-character VIN" maxLength={17} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Fuel type</label>
              <select className="input-field" value={fuelType} onChange={(e) => setFuelType(e.target.value)}>
                <option value="">Select fuel</option>
                {FUEL_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Current km</label>
              <input className="input-field" type="number" value={currentKm} onChange={(e) => setCurrentKm(e.target.value)} placeholder="0" min="0" />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Registering…' : 'Register vehicle & generate QR'}
          </button>
        </form>
      )}
    </div>
  );
}

function StepIndicator({ current, done, label, icon: Icon }: { current: boolean; done: boolean; label: string; icon: typeof User }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
        done ? 'bg-signal-green text-white' : current ? 'bg-accent-500 text-white' : 'bg-graphite-100 text-graphite-400 dark:bg-graphite-800'
      }`}>
        {done ? '✓' : <Icon className="h-4 w-4" />}
      </div>
      <span className={`text-sm font-semibold ${current || done ? 'text-graphite-900 dark:text-white' : 'text-graphite-400'}`}>{label}</span>
    </div>
  );
}
