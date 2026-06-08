import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import ErrorBoundary from './components/ErrorBoundary';
import PageSkeleton from './components/PageSkeleton';
import MainLayout from './layouts/MainLayout';
import superAdminApi from './lib/superAdminAxios';
import { Toaster } from 'react-hot-toast';

import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import NotFound from './pages/NotFound';
import SuperAdminLogin from './pages/superadmin/SuperAdminLogin';
import StaffOnboarding from './pages/StaffOnboarding';

const Paywall = lazy(() => import('./pages/Paywall'));
const SuperAdminDashboard = lazy(() => import('./pages/superadmin/SuperAdminDashboard'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Cashier = lazy(() => import('./pages/Cashier'));
const Tracking = lazy(() => import('./pages/Tracking'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const Services = lazy(() => import('./pages/Services'));
const Customers = lazy(() => import('./pages/Customers'));
const Staff = lazy(() => import('./pages/Staff'));
const Profile = lazy(() => import('./pages/Profile'));
const SubscriptionInfo = lazy(() => import('./pages/SubscriptionInfo'));

const AuthOnlyRoute = ({ children }) => {
  const { user, isAuthLoading } = useAuth();
  if (isAuthLoading) return <PageSkeleton />;
  if (!user) return <Navigate to="/login" />;
  return children;
};

const ProtectedRoute = ({ children }) => {
  const { user, isAuthLoading } = useAuth();
  if (isAuthLoading) return <PageSkeleton />;
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'STAFF' && (!user.isEmailVerified || user.mustChangePassword)) {
    return <Navigate to="/staff-onboarding" replace />;
  }
  return children;
};

const SuperAdminRoute = ({ children }) => {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    superAdminApi.get('/superadmin/me')
      .then(() => setAuthed(true))
      .catch(() => setAuthed(false))
      .finally(() => setChecking(false));
  }, []);

  if (checking) return <PageSkeleton />;
  if (!authed) return <Navigate to="/superadmin/login" />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <ErrorBoundary>
          <Router>
            <Toaster position="top-center" reverseOrder={false} />
            <Suspense fallback={<PageSkeleton />}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                <Route path="/superadmin/login" element={<SuperAdminLogin />} />
                <Route path="/superadmin/dashboard" element={<SuperAdminRoute><SuperAdminDashboard /></SuperAdminRoute>} />
                <Route path="/superadmin" element={<Navigate to="/superadmin/dashboard" />} />

                <Route path="/paywall" element={<ProtectedRoute><Paywall /></ProtectedRoute>} />
                <Route path="/staff-onboarding" element={<AuthOnlyRoute><StaffOnboarding /></AuthOnlyRoute>} />

                <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/cashier" element={<Cashier />} />
                  <Route path="/customers" element={<Customers />} />
                  <Route path="/tracking" element={<Tracking />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/services" element={<Services />} />
                  <Route path="/staff" element={<Staff />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/subscription" element={<SubscriptionInfo />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </Router>
        </ErrorBoundary>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
