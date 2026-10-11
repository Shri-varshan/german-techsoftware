import { type ReactNode, useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Car, Plus, Wrench, FileText, Package, Users, BarChart3, Settings, LogOut, Menu, X, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/lib/auth';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  ownerOnly?: boolean;
}

const navItems: NavItem[] = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/vehicles', label: 'Vehicles', icon: Car },
  { to: '/app/register', label: 'Register Car', icon: Plus },
  { to: '/app/jobs', label: 'Job Cards', icon: Wrench },
  { to: '/app/invoices', label: 'Invoices', icon: FileText },
  { to: '/app/parts', label: 'Parts', icon: Package },
  { to: '/app/customers', label: 'Customers', icon: Users },
  { to: '/app/reports', label: 'Reports', icon: BarChart3, ownerOnly: true },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

export default function AppShell({ children, title }: { children: ReactNode; title: string }) {
  const { profile, signOut, isGuest } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(() => {
    return localStorage.getItem('gt-theme') === 'dark';
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('gt-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('gt-theme', 'light');
    }
  }, [dark]);

  const visibleItems = navItems.filter((item) => !item.ownerOnly || profile?.role === 'owner');

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  return (
    <div className="flex min-h-screen bg-graphite-50 dark:bg-graphite-950">
      {/* Desktop sidebar */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-graphite-200 bg-white dark:border-graphite-800 dark:bg-graphite-900 lg:flex">
        <SidebarContent
          visibleItems={visibleItems}
          profile={profile}
          onSignOut={handleSignOut}
        />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-graphite-200 bg-white animate-slide-up dark:border-graphite-800 dark:bg-graphite-900 lg:hidden">
            <div className="flex items-center justify-between border-b border-graphite-200 px-4 py-3 dark:border-graphite-800">
              <span className="text-sm font-bold text-graphite-900 dark:text-white">Menu</span>
              <button onClick={() => setSidebarOpen(false)} className="btn-ghost p-1.5">
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarContent
              visibleItems={visibleItems}
              profile={profile}
              onSignOut={handleSignOut}
              onNavigate={() => setSidebarOpen(false)}
            />
          </aside>
        </>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col lg:pl-60">
        {/* Top bar */}
        <header className="no-print sticky top-0 z-20 flex items-center justify-between border-b border-graphite-200 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-graphite-800 dark:bg-graphite-900/80 lg:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="btn-ghost p-2 lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold text-graphite-900 dark:text-white">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDark(!dark)}
              className="btn-ghost p-2"
              aria-label="Toggle theme"
            >
              {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <div className="hidden items-center gap-2 sm:flex">
              <div className="text-right">
                <p className="text-xs font-semibold text-graphite-900 dark:text-white">{profile?.full_name}</p>
                <p className="text-2xs text-graphite-500 capitalize">{isGuest ? 'Guest' : profile?.role}</p>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-500/10 text-xs font-bold text-accent-600 dark:text-accent-400">
                {profile?.full_name?.charAt(0).toUpperCase() ?? '?'}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="no-print fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-graphite-200 bg-white px-2 py-2 dark:border-graphite-800 dark:bg-graphite-900 lg:hidden">
          {visibleItems.slice(0, 5).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/app'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-2xs font-semibold transition-colors ${
                  isActive
                    ? 'text-accent-600 dark:text-accent-400'
                    : 'text-graphite-400'
                }`
              }
            >
              <item.icon className="h-5 w-5" strokeWidth={2} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="h-16 lg:hidden" />
      </div>
    </div>
  );
}

function SidebarContent({
  visibleItems,
  profile,
  onSignOut,
  onNavigate,
}: {
  visibleItems: NavItem[];
  profile: { full_name: string; role: string } | null;
  onSignOut: () => void;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-3 border-b border-graphite-200 px-5 py-4 dark:border-graphite-800">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-500 shadow-md shadow-accent-500/20">
          <Wrench className="h-5 w-5 text-white" strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-sm font-bold text-graphite-900 dark:text-white">German Tech</p>
          <p className="text-2xs text-graphite-500">Workshop Manager</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/app'}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-accent-500/10 text-accent-700 dark:text-accent-300'
                  : 'text-graphite-500 hover:bg-graphite-100 hover:text-graphite-900 dark:hover:bg-graphite-800 dark:hover:text-white'
              }`
            }
          >
            <item.icon className="h-5 w-5" strokeWidth={2} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-graphite-200 p-3 dark:border-graphite-800">
        <button
          onClick={onSignOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-graphite-500 transition-colors hover:bg-signal-red/10 hover:text-signal-red"
        >
          <LogOut className="h-5 w-5" strokeWidth={2} />
          Sign out
        </button>
      </div>
    </>
  );
}
