import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, Mail, Lock, User, Shield, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useSecretAdminGesture } from '@/lib/useSecretAdminGesture';

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const secretGestureProps = useSecretAdminGesture();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('Germantech@gmail.com');
  const [password, setPassword] = useState('Germantech');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'owner' | 'staff'>('owner');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    if (mode === 'signin') {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error);
      } else {
        navigate('/app');
      }
    } else {
      const { error } = await signUp(email, password, fullName, role);
      if (error) setError(error);
      else {
        setError('Account created. Please sign in with your email and password.');
        setMode('signin');
      }
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen flex-col bg-graphite-950 lg:flex-row">
      {/* Left panel - branding */}
      <div className="relative flex flex-1 flex-col justify-between overflow-hidden p-8 lg:p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-900/30 via-graphite-950 to-graphite-950" />
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent-500/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-accent-700/10 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <img 
            src="/logo.png" 
            alt="German Tech" 
            {...secretGestureProps}
            className="h-14 w-14 rounded-xl object-contain bg-black/60 p-1 shadow-lg border border-graphite-800 cursor-default select-none" 
          />
          <div>
            <h1 className="text-xl font-bold text-white">German Tech</h1>
            <p className="text-xs text-graphite-400">Workshop Manager</p>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-3xl font-bold leading-tight text-white lg:text-4xl">
            Precision service for German engineering
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-graphite-400">
            Register vehicles, track service history, and give every car a permanent QR code.
            Your customers scan once and see their complete service timeline.
          </p>
          <div className="mt-8 space-y-3">
            {[
              'One QR code per car — lifetime service history',
              'Instant professional invoices in INR',
              'Staff and owner roles with access control',
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-3 text-sm text-graphite-300">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-500/20">
                  <ChevronRight className="h-3 w-3 text-accent-400" strokeWidth={3} />
                </div>
                {feat}
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-2xs text-graphite-600">
          BMW · Mercedes-Benz · Audi · Volkswagen · Porsche · Mini · Skoda
        </p>
      </div>

      {/* Right panel - auth form */}
      <div className="flex flex-1 items-center justify-center bg-graphite-50 p-6 dark:bg-graphite-900 lg:p-12">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-graphite-900 dark:text-white">
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </h2>
            <p className="mt-1 text-sm text-graphite-500">
              {mode === 'signin'
                ? 'Access your workshop dashboard'
                : 'Set up your workshop staff account'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="input-label">Full name</label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="input-field pl-10"
                      placeholder="Your name"
                    />
                  </div>
                </div>
                <div>
                  <label className="input-label">Role</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('owner')}
                      className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                        role === 'owner'
                          ? 'border-accent-500 bg-accent-500/10 text-accent-700 dark:text-accent-300'
                          : 'border-graphite-200 text-graphite-500 dark:border-graphite-700'
                      }`}
                    >
                      <Shield className="h-4 w-4" /> Owner
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('staff')}
                      className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                        role === 'staff'
                          ? 'border-accent-500 bg-accent-500/10 text-accent-700 dark:text-accent-300'
                          : 'border-graphite-200 text-graphite-500 dark:border-graphite-700'
                      }`}
                    >
                      <Wrench className="h-4 w-4" /> Staff
                    </button>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="input-label">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10"
                  placeholder="you@workshop.com"
                />
              </div>
            </div>

            <div>
              <label className="input-label">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10"
                  placeholder="Min 6 characters"
                />
              </div>
            </div>

            {error && (
              <div className={`rounded-xl p-3 text-sm ${error.includes('Account created') ? 'bg-signal-green/10 text-signal-green' : 'bg-signal-red/10 text-signal-red'}`}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-graphite-500">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }}
              className="font-semibold text-accent-600 hover:underline dark:text-accent-400"
            >
              {mode === 'signin' ? 'Create one' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
