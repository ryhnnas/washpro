import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import MainLayout from './layouts/MainLayout';
import Paywall from './pages/Paywall';
import SuperAdminLogin from './pages/superadmin/SuperAdminLogin';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';

// Halaman-halaman Tenant
import Dashboard from './pages/Dashboard';
import Cashier from './pages/Cashier';
import Tracking from './pages/Tracking';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Services from './pages/Services';
import Customers from './pages/Customers';
import Staff from './pages/Staff';
import Profile from './pages/Profile';
import SubscriptionInfo from './pages/SubscriptionInfo';

// Guard: Tenant harus login
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" />;
  return children;
};

// Guard: SuperAdmin harus login
const SuperAdminRoute = ({ children }) => {
  const token = localStorage.getItem('superadmin_token');
  if (!token) return <Navigate to="/superadmin/login" />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <Router>
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* SuperAdmin Portal */}
            <Route path="/superadmin/login" element={<SuperAdminLogin />} />
            <Route path="/superadmin/dashboard" element={<SuperAdminRoute><SuperAdminDashboard /></SuperAdminRoute>} />
            <Route path="/superadmin" element={<Navigate to="/superadmin/dashboard" />} />

            {/* Paywall (butuh login tenant, tapi di luar MainLayout agar tidak ada sidebar) */}
            <Route path="/paywall" element={<ProtectedRoute><Paywall /></ProtectedRoute>} />

            {/* Dashboard POS di dalam MainLayout */}
            <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/cashier" element={<Cashier />} />
              <Route path="customers" element={<Customers />} />
              <Route path="/tracking" element={<Tracking />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="services" element={<Services />} />
              <Route path="/staff" element={<Staff />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/subscription" element={<SubscriptionInfo />} />
            </Route>
          </Routes>
        </Router>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
