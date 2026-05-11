import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import MainLayout from './layouts/MainLayout';

// Halaman-halaman
import Dashboard from './pages/Dashboard';
import Cashier from './pages/Cashier';
import Tracking from './pages/Tracking';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Services from './pages/Services';
import Customers from './pages/Customers';
import Staff from './pages/Staff';
import Profile from './pages/Profile';

// Komponen Pembatas
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" />;
  return children;
};

// Placeholder untuk sementara jika file belum dibuat utuh
const PlaceholderPage = ({ title }) => (
  <div className="p-8 text-white"><h1 className="text-2xl font-bold">{title}</h1><p>Sedang dibangun...</p></div>
);

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Dashboard dan lain-lain di dalam MainLayout */}
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
        </Route>
      </Routes>
    </Router>
  );
}

export default App;