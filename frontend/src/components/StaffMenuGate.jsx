import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { canAccessStaffMenu } from '../utils/staffAccess';
import PageSkeleton from './PageSkeleton';

export function StaffAccessDenied({ menu = 'DASHBOARD' }) {
  return <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-primary">
    <h1 className="text-xl font-bold">Akses {menu === 'REPORTS' ? 'laporan' : 'dashboard'} tidak diizinkan</h1>
    <p className="mt-2">Hubungi owner untuk mengubah izin akses Anda.</p>
    <Link to="/cashier" className="mt-4 inline-block font-bold underline">Kembali ke kasir</Link>
  </div>;
}
export default function StaffMenuGate({ menu, children }) {
  const { user } = useAuth();
  const { settings, settingsLoading, settingsError, refreshSettings } = useApp();
  if (user?.role === 'OWNER') return children;
  if (settingsLoading && !settings) return <PageSkeleton />;
  if (settingsError) return <div role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-800">
    <p>{settingsError}</p><button type="button" onClick={refreshSettings} className="mt-2 font-bold underline">Muat ulang pengaturan</button>
  </div>;
  if (!canAccessStaffMenu(user, settings, menu)) return <StaffAccessDenied menu={menu} />;
  return children;
}
