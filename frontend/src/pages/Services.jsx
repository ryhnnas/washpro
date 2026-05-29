import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Save, X } from 'lucide-react';
import api from '../lib/axios';
import toast, { Toaster } from 'react-hot-toast';
import ConfirmDialog from '../components/ConfirmDialog';
import TableSkeleton from '../components/TableSkeleton';

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', price: '', type: 'KILOAN', unit: 'kg', estimateValue: 24, estimateUnit: 'HOUR' });
  const [isAdding, setIsAdding] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  const openConfirm = (title, message, onConfirm) =>
    setConfirmDialog({ isOpen: true, title, message, onConfirm });
  const closeConfirm = () =>
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await api.get('/services');
      setServices(res.data);
    } catch (err) {
      toast.error('Gagal memuat daftar layanan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        price: parseInt(formData.price),
        estimateValue: parseInt(formData.estimateValue),
      };

      if (editingId) {
        await api.put(`/services/${editingId}`, payload);
        toast.success('Layanan berhasil diperbarui.');
      } else {
        await api.post('/services', payload);
        toast.success('Layanan baru berhasil ditambahkan.');
      }
      
      setFormData({ name: '', price: '', type: 'KILOAN', unit: 'kg', estimateValue: 24, estimateUnit: 'HOUR' });
      setEditingId(null);
      setIsAdding(false);
      fetchServices();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan layanan.');
    }
    setSaving(false);
  };

  const handleEdit = (svc) => {
    setEditingId(svc.id);
    setFormData({
      name: svc.name,
      price: svc.price,
      type: svc.type,
      unit: svc.unit,
      estimateValue: svc.estimateValue || 24,
      estimateUnit: svc.estimateUnit || 'HOUR',
    });
    setIsAdding(true);
  };

  const handleDelete = async (id) => {
    openConfirm(
      'Hapus Layanan',
      'Layanan ini akan dihapus permanen. Layanan yang sudah pernah digunakan dalam transaksi tidak dapat dihapus.',
      async () => {
        try {
          await api.delete(`/services/${id}`);
          toast.success('Layanan berhasil dihapus.');
          fetchServices();
        } catch (err) {
          toast.error(err.response?.data?.error || 'Gagal menghapus layanan. Layanan ini mungkin sudah digunakan dalam transaksi.');
        }
      }
    );
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
           <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight">Manajemen Layanan</h1>
           <p className="text-xs sm:text-sm text-slate-500 mt-1">Atur harga paket cucian, jenis layanan, dan tagihan kasir Anda.</p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => { setIsAdding(true); setEditingId(null); setFormData({ name: '', price: '', type: 'KILOAN', unit: 'kg', estimateValue: 24, estimateUnit: 'HOUR' }); }}
            className="flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-primary text-white hover:bg-primary-light font-bold rounded-lg sm:rounded-xl shadow-lg transition-all text-xs sm:text-sm whitespace-nowrap"
          >
            <Plus size={18} className="sm:w-5 sm:h-5" /> Tambah Layanan Baru
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSave} className="glass-card p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-t-primary relative">
          <button type="button" onClick={() => setIsAdding(false)} className="absolute top-3 sm:top-6 right-3 sm:right-6 text-slate-400 hover:text-rose-500 transition-colors">
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
          
          <h2 className="text-lg sm:text-xl font-bold text-primary mb-4 sm:mb-6">{editingId ? 'Edit Layanan' : 'Tambah Layanan Baru'}</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 mb-4 sm:mb-6">
             <div>
               <label className="block text-xs sm:text-sm font-bold text-slate-600 mb-1.5 sm:mb-2">Nama Layanan</label>
               <input required placeholder="Contoh: Cuci Kilat" className="premium-input bg-secondary text-xs sm:text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
             </div>
             <div>
               <label className="block text-xs sm:text-sm font-bold text-slate-600 mb-1.5 sm:mb-2">Harga</label>
               <input required type="number" placeholder="5000" className="premium-input bg-secondary text-xs sm:text-sm" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
             </div>
             <div>
               <label className="block text-xs sm:text-sm font-bold text-slate-600 mb-1.5 sm:mb-2">Tipe Beban</label>
               <select required className="premium-input bg-secondary text-xs sm:text-sm" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                 <option value="KILOAN">Kiloan</option>
                 <option value="SATUAN">Satuan</option>
               </select>
             </div>
             <div>
               <label className="block text-xs sm:text-sm font-bold text-slate-600 mb-1.5 sm:mb-2">Unit (Satuan Ukur)</label>
               <select 
                required 
                className="premium-input bg-secondary text-xs sm:text-sm" 
                value={formData.unit} 
                onChange={e => setFormData({...formData, unit: e.target.value})}
              >
                <option value="kg">kg (Kiloan)</option>
                <option value="pcs">pcs (Satuan)</option>
                <option value="m2">m2 (Karpet)</option>
                <option value="pasang">pasang (Sepatu)</option>
                <option value="set">set (Seprai/Bedcover)</option>
                <option value="box">box</option>
              </select>
             </div>
             <div>
               <label className="block text-xs sm:text-sm font-bold text-slate-600 mb-1.5 sm:mb-2">Estimasi Durasi</label>
               <input required type="number" min="1" className="premium-input bg-secondary text-xs sm:text-sm" value={formData.estimateValue} onChange={e => setFormData({...formData, estimateValue: e.target.value})} />
             </div>
             <div>
               <label className="block text-xs sm:text-sm font-bold text-slate-600 mb-1.5 sm:mb-2">Unit Estimasi</label>
               <select required className="premium-input bg-secondary text-xs sm:text-sm" value={formData.estimateUnit} onChange={e => setFormData({...formData, estimateUnit: e.target.value})}>
                 <option value="HOUR">Jam</option>
                 <option value="DAY">Hari</option>
               </select>
             </div>
          </div>
          <button type="submit" disabled={saving} className="premium-button text-xs sm:text-sm md:text-base w-full sm:w-auto px-6 sm:px-8">
             <Save size={16} className="sm:w-4.5 sm:h-4.5" /> {saving ? "Menyimpan..." : "Simpan Layanan"}
          </button>
        </form>
      )}

      <div className="glass-card rounded-2xl sm:rounded-3xl overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs sm:text-sm whitespace-nowrap">
            <thead className="bg-primary/5 text-primary font-bold border-b border-slate-200">
              <tr>
                <th className="px-3 sm:px-6 py-3 sm:py-4">Nama Layanan</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4">Tipe Beban</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4">Harga / Unit</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4">Estimasi</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <TableSkeleton rows={5} cols={5} />
              ) : services.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-3 sm:px-6 py-6 sm:py-8 text-center text-slate-500 text-xs sm:text-sm">Belum ada layanan yang ditambahkan.</td>
                </tr>
              ) : services.map((svc) => (
                <tr key={svc.id} className="hover:bg-primary/[0.02] transition-colors">
                  <td className="px-3 sm:px-6 py-3 sm:py-4 font-bold text-primary truncate">{svc.name}</td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                     <span className={`inline-flex items-center px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-[9px] sm:text-xs font-bold uppercase tracking-wider ${svc.type === 'KILOAN' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                       {svc.type}
                     </span>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 font-semibold text-xs sm:text-sm">Rp {svc.price.toLocaleString('id-ID')} / {svc.unit}</td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 font-semibold text-xs sm:text-sm">{svc.estimateValue} {svc.estimateUnit === 'DAY' ? 'hari' : 'jam'}</td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                    <button onClick={() => handleEdit(svc)} className="p-1.5 sm:p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mr-1 sm:mr-2 inline-block">
                       <Edit size={16} className="sm:w-4.5 sm:h-4.5" />
                    </button>
                    <button onClick={() => handleDelete(svc.id)} className="p-1.5 sm:p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors inline-block">
                       <Trash2 size={16} className="sm:w-4.5 sm:h-4.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={() => { confirmDialog.onConfirm?.(); closeConfirm(); }}
        onCancel={closeConfirm}
      />
      <Toaster position="bottom-right" />
    </div>
  );
}
