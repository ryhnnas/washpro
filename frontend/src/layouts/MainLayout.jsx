import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Activity, FileText, Settings, LogOut, Menu, X, Bell, Tags, Users } from 'lucide-react';
import api from '../lib/axios';

export default function MainLayout() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [settings, setSettings] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/settings');
        setSettings(res.data);
      } catch (err) {
        console.error("Gagal load setting", err);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={22} />, id: 'DASHBOARD' },
    { name: 'Kasir', path: '/cashier', icon: <ShoppingCart size={22} />, id: 'CASHIER' },
    { name: 'Tracking', path: '/tracking', icon: <Activity size={22} />, id: 'TRACKING' },
    { name: 'Pelanggan', path: '/customers', icon: <Users size={22} />, id: 'CUSTOMERS' },
    { name: 'Laporan', path: '/reports', icon: <FileText size={22} />, id: 'REPORTS' },
  ];

  let allowedItems = navItems;
  if (user?.role === 'STAFF') {
    if (settings && settings.staffAllowedMenus) {
      try {
        const allowed = JSON.parse(settings.staffAllowedMenus);
        // CASHIER & TRACKING wajib aktif untuk semua staf
        allowedItems = navItems.filter(item => allowed.includes(item.id) || ['CASHIER', 'TRACKING'].includes(item.id));
      } catch(e) {}
    } else {
      allowedItems = navItems.filter(item => ['CASHIER', 'TRACKING'].includes(item.id));
    }
  }

  const currentRoute = [...navItems, { name: 'Pengaturan', path: '/settings' }, { name: 'Daftar Layanan', path: '/services' }].find(n => n.path === location.pathname)?.name || '';

  return (
    <div className="flex h-screen overflow-hidden bg-secondary text-primary font-sans">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-primary/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar - Tema Gelap (Navy #1A365D) */}
      <aside className={`
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        fixed inset-y-0 left-0 z-50 w-72 bg-primary text-secondary transition-transform duration-300 lg:static lg:translate-x-0 flex flex-col shadow-2xl
      `}>
        <div className="flex items-center justify-between p-6 h-20 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-tertiary flex justify-center items-center font-black text-primary shadow-lg shadow-tertiary/20">W</div>
            <h1 className="text-2xl font-black text-white tracking-wide">WashPro</h1>
          </div>
          <button className="lg:hidden p-2 rounded-lg hover:bg-white/10 text-secondary" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 mt-6 overflow-y-auto no-scrollbar">
          <p className="px-4 text-xs font-bold text-slate-300/60 uppercase tracking-widest mb-4">Master Menu</p>
          
          {allowedItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group font-medium
                ${isActive 
                  ? 'bg-tertiary text-primary shadow-lg shadow-tertiary/20 font-bold' 
                  : 'text-slate-200 hover:bg-white/10 hover:text-white'}
              `}
            >
              <div className={`transition-transform duration-300 ${location.pathname === item.path ? 'scale-110' : 'group-hover:scale-110'}`}>
                {item.icon}
              </div>
              <span>{item.name}</span>
            </NavLink>
          ))}
          
          {user?.role === 'OWNER' && (
            <>
              <p className="px-4 text-xs font-bold text-slate-300/60 uppercase tracking-widest mt-8 mb-4">Administrasi</p>
              <NavLink to="/services" className={({ isActive }) => `flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group font-medium ${isActive ? 'bg-tertiary text-primary shadow-lg shadow-tertiary/20 font-bold' : 'text-slate-200 hover:bg-white/10 hover:text-white'}`}>
                <div className={`transition-transform duration-300 group-hover:scale-110`}><Tags size={22} /></div>
                <span>Daftar Layanan</span>
              </NavLink>
              <NavLink to="/settings" className={({ isActive }) => `flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group font-medium ${isActive ? 'bg-tertiary text-primary shadow-lg shadow-tertiary/20 font-bold' : 'text-slate-200 hover:bg-white/10 hover:text-white'}`}>
                <div className={`transition-transform duration-300 group-hover:scale-110`}><Settings size={22} /></div>
                <span>Pengaturan Menu</span>
              </NavLink>
            </>
          )}
        </nav>

        <div className="p-4 m-4 rounded-2xl bg-primary-light border border-white/10 shadow-inner">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-tertiary border border-tertiary flex items-center justify-center text-primary font-bold text-lg">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 truncate">
              <p className="text-sm font-bold text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-300 font-medium truncate tracking-wide">{user?.role}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex justify-center items-center gap-2 px-4 py-2.5 bg-rose-500/20 hover:bg-rose-500 hover:text-white text-rose-200 rounded-xl transition-colors font-bold shadow-inner border border-rose-500/20"
          >
            <LogOut size={18} />
            <span className="text-sm">Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content - Tema Terang (Cream #F5F2EA) */}
      <main className="flex-1 flex flex-col overflow-hidden relative bg-secondary">
        <header className="h-20 flex items-center justify-between px-6 lg:px-10 border-b border-primary/5 bg-white/70 backdrop-blur-md z-30 relative sticky top-0 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2 -ml-2 rounded-xl text-primary hover:bg-primary/5 transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            <h2 className="text-xl font-extrabold text-primary hidden md:block">{currentRoute}</h2>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden sm:block text-right">
                <p className="text-sm font-extrabold text-primary">Selamat bekerja,</p>
                <p className="text-xs text-slate-500 font-medium">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
             </div>
             <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary/5 hover:bg-primary/10 text-primary transition-colors border border-primary/5">
                <Bell size={18} />
             </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10 relative">
          <div className="absolute inset-0 bg-[radial-gradient(#1A365D10_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none"></div>
          <div className="relative z-10 max-w-7xl mx-auto h-full">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
