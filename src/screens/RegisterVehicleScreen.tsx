import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Car, ChevronRight, AlertCircle, AlertTriangle, ExternalLink, CheckCircle2 } from 'lucide-react';
import { supabase, type Vehicle } from '@/lib/supabase';
import { CAR_MAKES, CAR_MODELS, FUEL_TYPES, COLOURS, formatPlate, generatePublicToken } from '@/lib/constants';
import { invalidateCache } from '@/lib/cache';

interface DuplicateMatch {
  id: string;
  make: string;
  model: string;
  year: number | null;
  number_plate: string;
  vin?: string;
  customer?: { name: string; phone: string };
  matchedBy: 'plate' | 'vin';
}

interface ExistingCustomerInfo {
  id: string;
  name: string;
  vehicles?: Array<{ id: string; make: string; model: string; number_plate: string }>;
}

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
  const [existingCustomer, setExistingCustomer] = useState<ExistingCustomerInfo | null>(null);

  // Vehicle fields
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));
  const [numberPlate, setNumberPlate] = useState('');
  const [vin, setVin] = useState('');
  const [colour, setColour] = useState('');
  const [fuelType, setFuelType] = useState('');

  // Duplicate vehicle match
  const [duplicateMatch, setDuplicateMatch] = useState<DuplicateMatch | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  async function onPhoneChange(val: string) {
    setPhone(val);
    const clean = val.replace(/\D/g, '');
    if (clean.length === 10) {
      const { data: cust } = await supabase
        .from('customers')
        .select('id, name, vehicles(id, make, model, number_plate)')
        .eq('phone', clean)
        .maybeSingle();

      if (cust) {
        setExistingCustomer(cust as any);
        if (!name.trim() && cust.name) setName(cust.name);
      } else {
        setExistingCustomer(null);
      }
    } else {
      setExistingCustomer(null);
    }
  }

  async function checkVehicleDuplicate(plateStr: string, vinStr: string) {
    const cleanPlate = plateStr.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const cleanVin = vinStr.trim().toUpperCase();

    if (cleanPlate.length < 4 && cleanVin.length < 5) {
      setDuplicateMatch(null);
      return null;
    }

    setCheckingDuplicate(true);
    try {
      const { data: allVehicles } = await supabase
        .from('vehicles')
        .select('id, make, model, year, number_plate, vin, customer:customers(name, phone)');

      if (!allVehicles) {
        setDuplicateMatch(null);
        return null;
      }

      const found = allVehicles.find((v: any) => {
        const vPlate = (v.number_plate || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        if (cleanPlate && cleanPlate.length >= 4 && vPlate === cleanPlate) {
          return true;
        }
        if (cleanVin && cleanVin.length >= 5 && v.vin && v.vin.trim().toUpperCase() === cleanVin) {
          return true;
        }
        return false;
      });

      if (found) {
        const vPlate = (found.number_plate || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        const matchedBy = (cleanPlate && vPlate === cleanPlate) ? 'plate' : 'vin';
        const cust = Array.isArray(found.customer) ? found.customer[0] : found.customer;
        const matchObj: DuplicateMatch = {
          id: found.id,
          make: found.make,
          model: found.model,
          year: found.year,
          number_plate: found.number_plate,
          vin: found.vin,
          customer: cust ? { name: cust.name, phone: cust.phone } : undefined,
          matchedBy
        };
        setDuplicateMatch(matchObj);
        return matchObj;
      } else {
        setDuplicateMatch(null);
        return null;
      }
    } catch (err) {
      console.error('Error checking duplicate vehicle:', err);
      return null;
    } finally {
      setCheckingDuplicate(false);
    }
  }

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

    // Check for duplicate vehicle by plate or VIN
    const match = await checkVehicleDuplicate(numberPlate, vin);
    if (match) {
      setError(`Vehicle already registered: ${match.make} ${match.model} (${match.number_plate})!`);
      setLoading(false);
      return;
    }

    const plate = formatPlate(numberPlate);

    // Find or create customer
    let customerId: string;
    const { data: existingCust } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();

    if (existingCust) {
      customerId = existingCust.id;
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
        vin: vin.trim().toUpperCase(),
        colour,
        fuel_type: fuelType,
        current_km: 0,
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
              onChange={(e) => onPhoneChange(e.target.value)} 
              placeholder="9840012345"
              pattern="\d{10}"
              maxLength={10}
              title="Phone number must be exactly 10 digits"
              required 
            />
          </div>

          {existingCustomer && (
            <div className="rounded-xl border border-primary-200 bg-primary-50/50 p-4 dark:border-primary-900/50 dark:bg-primary-950/20">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-700 dark:text-primary-300">
                <CheckCircle2 className="h-4 w-4" />
                Returning Customer Detected
              </div>
              <p className="mt-1 text-sm text-graphite-700 dark:text-graphite-300">
                Found existing customer profile for <span className="font-semibold text-graphite-900 dark:text-white">{existingCustomer.name}</span>.
              </p>
              {existingCustomer.vehicles && existingCustomer.vehicles.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-semibold text-graphite-500">Registered vehicle(s) for this customer:</p>
                  <div className="space-y-1.5">
                    {existingCustomer.vehicles.map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center justify-between rounded-lg border border-graphite-200 bg-white p-2.5 text-xs dark:border-graphite-700 dark:bg-graphite-800"
                      >
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                          <span className="font-bold text-graphite-900 dark:text-white">{v.number_plate}</span>
                          <span className="text-graphite-500">({v.make} {v.model})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate(`/app/vehicles/${v.id}`)}
                          className="flex items-center gap-1 rounded bg-primary-100 px-2.5 py-1 font-semibold text-primary-700 hover:bg-primary-200 dark:bg-primary-900/40 dark:text-primary-300"
                        >
                          Open Vehicle <ExternalLink className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

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
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setNumberPlate(val);
                  checkVehicleDuplicate(val, vin);
                }}
                onBlur={() => checkVehicleDuplicate(numberPlate, vin)}
                placeholder="TN 09 BT 1234"
                required
              />
            </div>
          </div>

          <div>
            <label className="input-label">VIN (optional)</label>
            <input 
              className="input-field uppercase" 
              value={vin} 
              onChange={(e) => {
                const val = e.target.value.toUpperCase();
                setVin(val);
                checkVehicleDuplicate(numberPlate, val);
              }}
              onBlur={() => checkVehicleDuplicate(numberPlate, vin)}
              placeholder="17-character VIN" 
              maxLength={17} 
            />
          </div>

          <div>
            <label className="input-label">Fuel type</label>
            <select className="input-field" value={fuelType} onChange={(e) => setFuelType(e.target.value)}>
              <option value="">Select fuel</option>
              {FUEL_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          {duplicateMatch && (
            <div className="rounded-xl border border-signal-amber/40 bg-signal-amber/10 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 text-signal-amber mt-0.5" />
                <div className="flex-1 text-sm">
                  <h4 className="font-bold text-signal-amber">
                    Vehicle Already Registered! ({duplicateMatch.matchedBy === 'plate' ? 'Matching Plate' : 'Matching VIN'})
                  </h4>
                  <p className="mt-1 text-graphite-700 dark:text-graphite-300">
                    This vehicle is already in the system: <span className="font-bold text-graphite-900 dark:text-white">{duplicateMatch.make} {duplicateMatch.model} ({duplicateMatch.number_plate})</span>
                    {duplicateMatch.customer?.name && ` belonging to ${duplicateMatch.customer.name}`}
                    {duplicateMatch.customer?.phone && ` (${duplicateMatch.customer.phone})`}.
                  </p>
                  <p className="mt-1 text-xs text-graphite-500">
                    To avoid duplicate records, open this existing vehicle profile directly to view history or start a new job card.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/app/vehicles/${duplicateMatch.id}`)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-signal-amber px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:brightness-110"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open Vehicle & New Job Card
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading || duplicateMatch !== null || checkingDuplicate} 
            className={`btn-primary w-full ${duplicateMatch !== null ? 'opacity-50 cursor-not-allowed bg-graphite-400 hover:bg-graphite-400' : ''}`}
          >
            {loading ? 'Registering…' : checkingDuplicate ? 'Checking duplicates…' : duplicateMatch ? 'Cannot Register (Duplicate Vehicle)' : 'Register vehicle & generate QR'}
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
