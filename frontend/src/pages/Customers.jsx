import { useState, useEffect } from 'react';
import { Edit, Trash2, Search, Save, X, ChevronLeft, ChevronRight, Filter, Gift, Clock } from 'lucide-react';
import api from '../lib/axios';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import toast, { Toaster } from 'react-hot-toast';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [membershipFilter, setMembershipFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });
  const [showAddMembershipForm, setShowAddMembershipForm] = useState(false);
  const [newMembershipCustomer, setNewMembershipCustomer] = useState({ name: '', phone: '', address: '', templateId: '' });
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [targetCustomerId, setTargetCustomerId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  const { user } = useAuth();
  const { settings } = useApp();
  const isOwner = user?.role === 'OWNER';
  const membershipPackages = settings?.membershipPackages || [];

  const openConfirm = (title, message, onConfirm) =>
    setConfirmDialog({ isOpen: true, title, message, onConfirm });
  const closeConfirm = () =>
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [membershipFilter]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 50, search: debouncedSearch });
      if (membershipFilter) params.append('membershipStatus', membershipFilter);
      const res = await api.get(`/customers?${params}`);
      setCustomers(res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    // membershipPackages sudah dari AppContext, tidak perlu fetch lagi
  }, [page, debouncedSearch, membershipFilter]);

  const handleEdit = (c) => {
    setEditingId(c.id);
    setFormData({ name: c.name, phone: c.phone || '', address: c.address || '' });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await api.put(`/customers/${editingId}`, formData);
      } else {
        await api.post('/customers', formData);
      }
      setEditingId(null);
      setFormData({ name: '', phone: '', address: '' });
      fetchCustomers();
    } catch (err) {
      toast.error('Gagal menyimpan data pelanggan. Pastikan nomor HP tidak duplikat.');
    }
    setLoading(false);
  };

  const handleActivateMembership = async (id, templateId = null) => {
    if (!templateId && membershipPackages.length > 1) {
      setTargetCustomerId(id);
      setShowPackageModal(true);
      return;
    }

    const tid = templateId || (membershipPackages.length > 0 ? membershipPackages[0].id : null);
    if (!tid) {
      toast.error('Tidak ada paket membership yang tersedia.');
      return;
    }

    openConfirm(
      'Aktifkan Membership',
      'Aktifkan paket membership untuk pelanggan ini? Membership aktif sebelumnya akan dibatalkan.',
      async () => {
        try {
          await api.post(`/customers/${id}/membership/activate`, { templateId: tid });
          setShowPackageModal(false);
          toast.success('Membership berhasil diaktifkan.');
          fetchCustomers();
        } catch (err) {
          toast.error(err.response?.data?.message || err.response?.data?.error || 'Gagal aktivasi membership');
        }
      }
    );
  };

  const handleDelete = async (id) => {
    openConfirm(
      'Hapus Pelanggan',
      'Data pelanggan ini akan dihapus permanen. Aksi ini tidak dapat dibatalkan.',
      async () => {
        try {
          await api.delete(`/customers/${id}`);
          toast.success('Pelanggan berhasil dihapus.');
          fetchCustomers();
        } catch (err) {
          toast.error('Gagal menghapus. Pelanggan ini mungkin masih memiliki transaksi aktif.');
        }
      }
    );
  };

  const handleCreateCustomerWithMembership = async (e) => {
    e.preventDefault();
    try {
      await api.post('/customers/with-membership', newMembershipCustomer);
      setNewMembershipCustomer({ name: '', phone: '', address: '', templateId: '' });
      setShowAddMembershipForm(false);
      fetchCustomers();
      toast.success('Customer + membership berhasil dibuat.');
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Gagal membuat customer membership');
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-primary tracking-tight flex items-center gap-2">
            CRM & Membership
          </h1>
          <p className="text-slate-500 mt-1">Kelola data pelanggan dan paket membership berbayar berbasis kuota.</p>
        </div>

        <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
            <button
              type="button"
              onClick={() => setShowAddMembershipForm((v) => !v)}
              className="px-4 py-3 bg-primary text-white rounded-2xl text-sm font-bold"
            >
              {showAddMembershipForm ? 'Tutup Form' : 'Tambah Membership Baru'}
            </button>
           <div className="relative">
             <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
               <Filter size={16} className="text-slate-400"/>
             </div>
             <select
               value={membershipFilter}
               onChange={(e) => setMembershipFilter(e.target.value)}
               className="pl-10 pr-8 py-3 bg-white border border-slate-200 rounded-2xl focus:border-primary outline-none text-primary text-sm font-bold shadow-sm cursor-pointer appearance-none"
             >
               <option value="">Semua</option>
               <option value="ACTIVE">Membership Aktif</option>
               <option value="NONE">Tanpa Membership</option>
             </select>
           </div>
            <div className="relative w-full sm:w-64 group">
              <input
                type="text"
                placeholder="Cari nama atau HP..."
                className="premium-input bg-white premium-input-icon py-3 text-sm shadow-sm"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
            </div>
        </div>
      </div>

      {showAddMembershipForm && (
        <form onSubmit={handleCreateCustomerWithMembership} className="glass-card p-6 rounded-3xl border-t-emerald-500 border-t-[6px]">
          <h2 className="text-xl font-bold text-primary mb-4">Tambah Membership Baru (Customer Baru)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">Nama Customer</label>
              <input required className="premium-input bg-secondary" value={newMembershipCustomer.name} onChange={(e) => setNewMembershipCustomer({ ...newMembershipCustomer, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">No WhatsApp (opsional)</label>
              <input className="premium-input bg-secondary" value={newMembershipCustomer.phone || ''} onChange={(e) => setNewMembershipCustomer({ ...newMembershipCustomer, phone: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">Pilih Paket Membership</label>
              <select 
                required 
                className="premium-input bg-secondary" 
                value={newMembershipCustomer.templateId || ''} 
                onChange={(e) => setNewMembershipCustomer({ ...newMembershipCustomer, templateId: e.target.value })}
              >
                <option value="">-- Pilih Paket --</option>
                {membershipPackages.map(p => <option key={p.id} value={p.id}>{p.name} ({p.durationDays} hari)</option>)}
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-bold text-slate-600 mb-2">Alamat (opsional)</label>
              <input className="premium-input bg-secondary" value={newMembershipCustomer.address || ''} onChange={(e) => setNewMembershipCustomer({ ...newMembershipCustomer, address: e.target.value })} />
            </div>
          </div>
          <button type="submit" className="premium-button text-sm">Simpan + Aktifkan Membership</button>
        </form>
      )}

      {editingId && (
        <form onSubmit={handleSave} className="glass-card p-6 rounded-3xl border-t-tertiary relative">
          <button type="button" onClick={() => {setEditingId(null); setFormData({name:'', phone:'', address:''});}} className="absolute top-6 right-6 text-slate-400 hover:text-rose-500 transition-colors">
            <X size={24} />
          </button>
          <h2 className="text-xl font-bold text-primary mb-6">Edit Data Pelanggan</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
             <div>
               <label className="block text-sm font-bold text-slate-600 mb-2">Nama Pelanggan</label>
               <input required className="premium-input bg-secondary" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
             </div>
             <div>
               <label className="block text-sm font-bold text-slate-600 mb-2">Nomor WhatsApp</label>
               <input className="premium-input bg-secondary" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
             </div>
             <div>
               <label className="block text-sm font-bold text-slate-600 mb-2">Alamat Domisili</label>
               <input className="premium-input bg-secondary" value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
             </div>
          </div>
          <button type="submit" disabled={loading} className="premium-button text-sm md:text-base px-8">
             <Save size={18} /> Update Data
          </button>
        </form>
      )}

      <div className="glass-card rounded-3xl overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-primary/5 text-primary font-bold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Pelanggan</th>
                <th className="px-6 py-4">Membership</th>
                <th className="px-6 py-4">Sisa Kuota</th>
                <th className="px-6 py-4 text-center">Frekuensi Cuci</th>
                <th className="px-6 py-4">Last Visit</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500 text-base">Memuat pelanggan...</td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-slate-500 text-base">Belum ada pelanggan ditemukan.</td>
                </tr>
              ) : (
                customers.map((c) => {
                  const membership = c.membership;
                  const isActiveMembership = membership?.isActive;
                  return (
                    <tr key={c.id} className="hover:bg-primary/[0.02] transition-colors">
                      <td className="px-6 py-4">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-tertiary/20 text-tertiary-hover flex items-center justify-center font-bold">
                               {c.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-bold text-primary block">{c.name}</span>
                              <span className="text-xs text-slate-400 font-medium">{c.phone || 'Tanpa no HP'}</span>
                            </div>
                         </div>
                      </td>
                      <td className="px-6 py-4">
                        {membership ? (
                          <div className="space-y-1">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border ${isActiveMembership ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                              <Gift size={12} /> {isActiveMembership ? 'Aktif' : membership.status}
                            </span>
                            <div className="text-xs text-slate-500 flex items-center gap-1"><Clock size={12} /> Berakhir {formatDate(membership.endAt)}</div>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-slate-400">Belum berlangganan</span>
                        )}
                      </td>
                      <td className="px-6 py-4 max-w-[260px]">
                        {!membership?.balances?.length ? (
                          <span className="text-xs text-slate-400">-</span>
                        ) : (
                          <div className="space-y-1">
                            {membership.balances.slice(0, 3).map((b) => (
                              <div key={b.serviceId} className="text-xs">
                                <span className="font-semibold text-primary">{b.serviceName}</span>
                                <span className="text-slate-500">: {Number(b.remainingQty).toFixed(2)} / {Number(b.initialQty).toFixed(2)} {b.unit}</span>
                              </div>
                            ))}
                            {membership.balances.length > 3 && <div className="text-[11px] text-slate-400">+{membership.balances.length - 3} layanan lainnya</div>}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-black text-primary text-base">{c.transactionCount || 0}</span>
                        <span className="text-slate-400 text-xs ml-1">x</span>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-500">{formatDate(c.lastTransactionAt)}</td>
                      <td className="px-6 py-4 text-right">
                        {!isActiveMembership && (
                          <button onClick={() => handleActivateMembership(c.id)} className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg mr-2">
                            Aktifkan Paket
                          </button>
                        )}
                        <button onClick={() => handleEdit(c)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mr-2">
                           <Edit size={18} />
                        </button>
                        {isOwner && (
                          <button onClick={() => handleDelete(c.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                             <Trash2 size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
           <span className="text-sm font-bold text-slate-500">Halaman {page} dari {totalPages || 1}</span>
           <div className="flex items-center gap-2">
             <button
               disabled={page <= 1}
               onClick={() => setPage(p => p - 1)}
               className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-primary disabled:opacity-50 disabled:pointer-events-none transition-colors"
             >
               <ChevronLeft size={20} />
             </button>
             <button
               disabled={page >= totalPages}
               onClick={() => setPage(p => p + 1)}
               className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-primary disabled:opacity-50 disabled:pointer-events-none transition-colors"
             >
               <ChevronRight size={20} />
             </button>
           </div>
        </div>
      </div>
      {/* MODAL PILIH PAKET */}
      {showPackageModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-emerald-50">
                 <h3 className="text-xl font-black text-primary flex items-center gap-2"><Gift className="text-emerald-500"/> Pilih Paket</h3>
                 <button onClick={() => setShowPackageModal(false)} className="text-slate-400 hover:text-rose-500"><X size={24}/></button>
              </div>
              <div className="p-6 space-y-3">
                 <p className="text-sm font-bold text-slate-500 mb-4">Silakan pilih paket membership yang ingin diaktifkan:</p>
                 {membershipPackages.map(p => (
                   <button 
                     key={p.id}
                     onClick={() => handleActivateMembership(targetCustomerId, p.id)}
                     className="w-full p-4 rounded-2xl border-2 border-emerald-100 hover:border-emerald-500 hover:bg-emerald-50 text-left transition-all group"
                   >
                     <div className="flex justify-between items-center">
                        <span className="font-black text-primary group-hover:text-emerald-700">{p.name}</span>
                        <ChevronRight size={20} className="text-emerald-300 group-hover:translate-x-1 transition-transform"/>
                     </div>
                     <span className="text-xs font-bold text-slate-400">Durasi: {p.durationDays} hari</span>
                   </button>
                 ))}
              </div>
           </div>
        </div>
      )}

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
