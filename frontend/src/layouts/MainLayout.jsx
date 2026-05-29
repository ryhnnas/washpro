import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Activity, FileText, Settings, LogOut, Menu, X, Tags, Users, UserPlus, User, CreditCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
const logo = '/logo.png';
import SubscriptionBanner from '../components/SubscriptionBanner';

export default function MainLayout() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const { user, logout } = useAuth();
  const { settings } = useApp();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
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
        fixed inset-y-0 left-0 z-50 w-56 sm:w-64 lg:w-72 bg-primary text-secondary transition-transform duration-300 lg:static lg:translate-x-0 flex flex-col shadow-2xl
      `}>
        <div className="flex items-center justify-between p-3 sm:p-4 lg:p-6 h-16 sm:h-18 lg:h-20 border-b border-white/10">
          <div className="flex items-center gap-2 sm:gap-3">
            <img src={logo} alt="WashPro Logo" className="w-8 sm:w-10 lg:w-12 h-auto object-contain" />
            <h1 className="text-lg sm:text-xl lg:text-2xl font-black text-white tracking-wide truncate">
              {'WashPro'}
            </h1>
          </div>
          <button className="lg:hidden p-1.5 sm:p-2 rounded-lg hover:bg-white/10 text-secondary" onClick={() => setSidebarOpen(false)}>
            <X size={18} className="sm:w-5 sm:h-5" />
          </button>
        </div>

        <nav className="flex-1 px-2 sm:px-3 lg:px-4 space-y-1 sm:space-y-1.5 mt-4 sm:mt-6 overflow-y-auto no-scrollbar">
          <p className="px-2 sm:px-4 text-[10px] sm:text-xs font-bold text-slate-300/60 uppercase tracking-widest mb-3 sm:mb-4">Master Menu</p>
          
          {allowedItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2.5 sm:py-3.5 rounded-lg sm:rounded-2xl transition-all duration-300 group font-medium text-xs sm:text-sm
                ${isActive 
                  ? 'bg-tertiary text-primary shadow-lg shadow-tertiary/20 font-bold' 
                  : 'text-slate-200 hover:bg-white/10 hover:text-white'}
              `}
            >
              <div className={`transition-transform duration-300 ${location.pathname === item.path ? 'scale-110' : 'group-hover:scale-110'}`}>
                {item.icon}
              </div>
              <span className="truncate">{item.name}</span>
            </NavLink>
          ))}
          
          {user?.role === 'OWNER' && (
            <>
              <p className="px-2 sm:px-4 text-[10px] sm:text-xs font-bold text-slate-300/60 uppercase tracking-widest mt-6 sm:mt-8 mb-3 sm:mb-4">Administrasi</p>
              <NavLink to="/subscription" className={({ isActive }) => `flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2.5 sm:py-3.5 rounded-lg sm:rounded-2xl transition-all duration-300 group font-medium text-xs sm:text-sm ${isActive ? 'bg-tertiary text-primary shadow-lg shadow-tertiary/20 font-bold' : 'text-slate-200 hover:bg-white/10 hover:text-white'}`}>
                <div className={`transition-transform duration-300 group-hover:scale-110`}><CreditCard size={18} className="sm:w-5 sm:h-5" /></div>
                <span className="truncate">Informasi Langganan</span>
              </NavLink>
              <NavLink to="/services" className={({ isActive }) => `flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2.5 sm:py-3.5 rounded-lg sm:rounded-2xl transition-all duration-300 group font-medium text-xs sm:text-sm ${isActive ? 'bg-tertiary text-primary shadow-lg shadow-tertiary/20 font-bold' : 'text-slate-200 hover:bg-white/10 hover:text-white'}`}>
                <div className={`transition-transform duration-300 group-hover:scale-110`}><Tags size={18} className="sm:w-5 sm:h-5" /></div>
                <span className="truncate">Daftar Layanan</span>
              </NavLink>
              <NavLink to="/settings" className={({ isActive }) => `flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2.5 sm:py-3.5 rounded-lg sm:rounded-2xl transition-all duration-300 group font-medium text-xs sm:text-sm ${isActive ? 'bg-tertiary text-primary shadow-lg shadow-tertiary/20 font-bold' : 'text-slate-200 hover:bg-white/10 hover:text-white'}`}>
                <div className={`transition-transform duration-300 group-hover:scale-110`}><Settings size={18} className="sm:w-5 sm:h-5" /></div>
                <span className="truncate">Pengaturan Menu</span>
              </NavLink>
              <NavLink to="/staff" className={({ isActive }) => `flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2.5 sm:py-3.5 rounded-lg sm:rounded-2xl transition-all duration-300 group font-medium text-xs sm:text-sm ${isActive ? 'bg-tertiary text-primary shadow-lg shadow-tertiary/20 font-bold' : 'text-slate-200 hover:bg-white/10 hover:text-white'}`}>
                <div className={`transition-transform duration-300 group-hover:scale-110`}><UserPlus size={18} className="sm:w-5 sm:h-5" /></div>
                <span className="truncate">Kelola Staf</span>
              </NavLink>
            </>
          )}
        </nav>

        <div className="p-2 sm:p-3 lg:p-4 m-2 sm:m-3 lg:m-4 rounded-lg sm:rounded-2xl bg-primary-light border border-white/10 shadow-inner">
          <NavLink to="/profile" className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-4 hover:bg-white/5 p-1 rounded-xl transition-colors">
            <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-lg sm:rounded-xl bg-tertiary border border-tertiary flex items-center justify-center text-primary font-bold text-xs sm:text-lg flex-shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 truncate min-w-0">
              <p className="text-xs sm:text-sm font-bold text-white truncate">{user?.name}</p>
              <p className="text-[10px] sm:text-xs text-slate-300 font-medium truncate tracking-wide">{user?.role}</p>
            </div>
          </NavLink>
          <button 
            onClick={handleLogout}
            className="w-full flex justify-center items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2.5 bg-rose-500/20 hover:bg-rose-500 hover:text-white text-rose-200 rounded-lg sm:rounded-xl transition-colors font-bold shadow-inner border border-rose-500/20 text-xs sm:text-sm"
          >
            <LogOut size={16} className="sm:w-4.5 sm:h-4.5" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content - Tema Terang (Cream #F5F2EA) */}
      <main className="flex-1 flex flex-col overflow-hidden relative bg-secondary">
        {/* Banner Peringatan Langganan (H-7) */}
        <SubscriptionBanner />
        <header className="h-16 sm:h-18 lg:h-20 flex items-center justify-between px-3 sm:px-6 lg:px-10 border-b border-primary/5 bg-white/70 backdrop-blur-md z-30 relative sticky top-0 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              className="lg:hidden p-1.5 sm:p-2 -ml-1.5 sm:-ml-2 rounded-lg sm:rounded-xl text-primary hover:bg-primary/5 transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} className="sm:w-6 sm:h-6" />
            </button>
            <div className="flex items-center gap-2">
              <img src={logo} alt="Logo" className="w-6 sm:w-8 h-auto object-contain lg:hidden" />
              <h2 className="text-sm sm:text-lg lg:text-xl font-extrabold text-primary truncate">
                {settings?.businessName || 'WashPro'}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
             <div className="hidden sm:block text-right">
                <p className="text-xs sm:text-sm font-extrabold text-primary">Selamat bekerja, {user?.name?.split(' ')[0]}</p>
                <p className="text-[10px] sm:text-xs text-slate-500 font-medium">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
             </div>
             <button 
                onClick={() => navigate('/profile')}
                className="w-8 sm:w-10 h-8 sm:h-10 flex items-center justify-center rounded-lg sm:rounded-xl bg-primary/5 hover:bg-primary/10 text-primary transition-colors border border-primary/5"
             >
                <User size={16} className="sm:w-4.5 sm:h-4.5" />
             </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-10 relative">
          <div className="absolute inset-0 bg-[radial-gradient(#1A365D10_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none"></div>
          <div className="relative z-10 max-w-7xl mx-auto h-full">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
