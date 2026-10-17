import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { prefetchCommonData } from '@/lib/cache';
import AppShell from '@/components/AppShell';
import LoginScreen from '@/screens/LoginScreen';
import DashboardScreen from '@/screens/DashboardScreen';
import RegisterVehicleScreen from '@/screens/RegisterVehicleScreen';
import VehicleListScreen from '@/screens/VehicleListScreen';
import VehicleDetailScreen from '@/screens/VehicleDetailScreen';
import JobListScreen from '@/screens/JobListScreen';
import JobDetailScreen from '@/screens/JobDetailScreen';
import InvoiceListScreen from '@/screens/InvoiceListScreen';
import InvoiceDetailScreen from '@/screens/InvoiceDetailScreen';
import PartsCatalogueScreen from '@/screens/PartsCatalogueScreen';
import CustomersScreen from '@/screens/CustomersScreen';
import ReportsScreen from '@/screens/ReportsScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import PublicCarPage from '@/screens/PublicCarPage';
import PublicInvoicePage from '@/screens/PublicInvoicePage';
import AdminDashboardScreen from '@/screens/AdminDashboardScreen';
import { Wrench } from 'lucide-react';

function ProtectedLayout() {
  const { session, loading, profile, isGuest } = useAuth();
  const location = useLocation();

  useEffect(() => {
    prefetchCommonData();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-graphite-50 dark:bg-graphite-950">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-graphite-200 border-t-accent-500" />
      </div>
    );
  }

  if (!session && !profile && !isGuest) {
    return <Navigate to="/" replace />;
  }

  if (location.pathname === '/app/reports' && profile?.role !== 'owner') {
    return <Navigate to="/app" replace />;
  }

  return <AppShell />;
}

function AppRoutes() {
  const { session, profile, loading, isGuest } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-graphite-50 dark:bg-graphite-950">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-500 shadow-lg">
            <Wrench className="h-6 w-6 text-white" strokeWidth={2.5} />
          </div>
          <div className="h-1 w-24 animate-pulse rounded bg-graphite-200 dark:bg-graphite-700" />
        </div>
      </div>
    );
  }

  const isAuthenticated = Boolean(session || profile || isGuest);

  return (
    <Routes>
      <Route path="/" element={isAuthenticated ? <Navigate to="/app" replace /> : <LoginScreen />} />
      <Route path="/car/:token" element={<PublicCarPage />} />
      <Route path="/invoice/:token" element={<PublicInvoicePage />} />

      <Route element={<ProtectedLayout />}>
        <Route path="/app" element={<DashboardScreen />} />
        <Route path="/app/register" element={<RegisterVehicleScreen />} />
        <Route path="/app/vehicles" element={<VehicleListScreen />} />
        <Route path="/app/vehicles/:id" element={<VehicleDetailScreen />} />
        <Route path="/app/jobs" element={<JobListScreen />} />
        <Route path="/app/jobs/:id" element={<JobDetailScreen />} />
        <Route path="/app/invoices" element={<InvoiceListScreen />} />
        <Route path="/app/invoices/:id" element={<InvoiceDetailScreen />} />
        <Route path="/app/parts" element={<PartsCatalogueScreen />} />
        <Route path="/app/customers" element={<CustomersScreen />} />
        <Route path="/app/reports" element={<ReportsScreen />} />
        <Route path="/app/admin" element={<AdminDashboardScreen />} />
        <Route path="/app/settings" element={<SettingsScreen />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AuthProvider>
  );
}
