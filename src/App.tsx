import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { type ReactNode } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
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
import { Wrench } from 'lucide-react';

function ProtectedRoute({ children, title }: { children: ReactNode; title: string }) {
  const { session, loading, profile, isGuest } = useAuth();

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

  if (title === 'Reports' && profile?.role !== 'owner') {
    return <Navigate to="/app" replace />;
  }

  return <AppShell title={title}>{children}</AppShell>;
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
      <Route path="/app" element={<ProtectedRoute title="Dashboard"><DashboardScreen /></ProtectedRoute>} />
      <Route path="/app/register" element={<ProtectedRoute title="Register Vehicle"><RegisterVehicleScreen /></ProtectedRoute>} />
      <Route path="/app/vehicles" element={<ProtectedRoute title="Vehicles"><VehicleListScreen /></ProtectedRoute>} />
      <Route path="/app/vehicles/:id" element={<ProtectedRoute title="Vehicle Detail"><VehicleDetailScreen /></ProtectedRoute>} />
      <Route path="/app/jobs" element={<ProtectedRoute title="Job Cards"><JobListScreen /></ProtectedRoute>} />
      <Route path="/app/jobs/:id" element={<ProtectedRoute title="Job Card"><JobDetailScreen /></ProtectedRoute>} />
      <Route path="/app/invoices" element={<ProtectedRoute title="Invoices"><InvoiceListScreen /></ProtectedRoute>} />
      <Route path="/app/invoices/:id" element={<ProtectedRoute title="Invoice"><InvoiceDetailScreen /></ProtectedRoute>} />
      <Route path="/app/parts" element={<ProtectedRoute title="Parts Catalogue"><PartsCatalogueScreen /></ProtectedRoute>} />
      <Route path="/app/customers" element={<ProtectedRoute title="Customers"><CustomersScreen /></ProtectedRoute>} />
      <Route path="/app/reports" element={<ProtectedRoute title="Reports"><ReportsScreen /></ProtectedRoute>} />
      <Route path="/app/settings" element={<ProtectedRoute title="Settings"><SettingsScreen /></ProtectedRoute>} />
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
