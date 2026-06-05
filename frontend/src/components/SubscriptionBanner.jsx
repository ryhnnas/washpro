import { useState } from 'react';
import { X, AlertTriangle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

/**
 * SubscriptionBanner — Banner peringatan perpanjangan langganan.
 * - Muncul jika sisa waktu <= 7 hari (TRIAL atau ACTIVE)
 * - Dapat ditutup dengan tombol X (tersimpan di sessionStorage, reset tiap buka tab baru)
 * - Data subscription diambil dari AppContext (tidak fetch ulang)
 */
export default function SubscriptionBanner() {
  const [dismissed, setDismissed] = useState(() =>
    !!sessionStorage.getItem('subscription_banner_dismissed')
  );
  const navigate = useNavigate();
  const { subscription } = useApp();

  const handleDismiss = () => {
    sessionStorage.setItem('subscription_banner_dismissed', 'true');
    setDismissed(true);
  };

  if (dismissed || !subscription?.showWarningBanner) return null;

  const { daysRemaining, subscriptionStatus } = subscription;
  const isTrial = subscriptionStatus === 'TRIAL';

  const getBannerStyle = () => {
    if (daysRemaining <= 2) return { bg: 'bg-red-500', text: 'text-white', border: 'border-red-600' };
    if (daysRemaining <= 4) return { bg: 'bg-amber-500', text: 'text-white', border: 'border-amber-600' };
    return { bg: 'bg-blue-500', text: 'text-white', border: 'border-blue-600' };
  };

  const style = getBannerStyle();

  const getMessage = () => {
    if (daysRemaining <= 1) {
      return isTrial
        ? 'Masa uji coba Anda berakhir HARI INI! Berlangganan sekarang agar data tidak hilang.'
        : 'Langganan Anda berakhir HARI INI! Segera lakukan perpanjangan.';
    }
    return isTrial
      ? `Masa uji coba gratis akan berakhir dalam ${daysRemaining} hari. Berlangganan sekarang agar data tidak hilang.`
      : `Paket akan berakhir dalam ${daysRemaining} hari. Silakan melakukan pembayaran ulang.`;
  };

  return (
    <div
      className={`${style.bg} ${style.text} ${style.border} border-b flex items-center justify-between gap-2 px-4 py-2.5 text-sm font-medium shadow-sm flex-shrink-0`}
      style={{ zIndex: 40 }}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {daysRemaining <= 2 ? <AlertTriangle size={16} className="flex-shrink-0" /> : <Clock size={16} className="flex-shrink-0" />}
        <span className="truncate">{getMessage()}</span>
        <button
          onClick={() => navigate('/paywall')}
          className="ml-2 flex-shrink-0 underline font-bold whitespace-nowrap hover:opacity-80 transition-opacity"
        >
          Berlangganan Sekarang →
        </button>
      </div>
      <button
        id="subscription-banner-close"
        onClick={handleDismiss}
        className="flex-shrink-0 p-1 rounded-full hover:bg-white/20 transition-colors"
        title="Tutup peringatan ini"
      >
        <X size={16} />
      </button>
    </div>
  );
}
