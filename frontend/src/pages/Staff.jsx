import { useState, useEffect } from 'react';
import { UserPlus, Search, Trash2, Edit2, X, Check, Loader2, User, Mail, Phone } from 'lucide-react';
import api from '../lib/axios';
import toast, { Toaster } from 'react-hot-toast';
import PasswordInput, { getPasswordPolicyErrors } from '../components/PasswordInput';

export default function Staff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await api.get('/staff');
      setStaff(res.data || []);
    } catch {
      toast.error("Gagal memuat daftar staf");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleOpenModal = (st = null) => {
    if (st) {
      setEditingStaff(st);
      setFormData({ name: st.name, email: st.email, phone: st.phone || '', password: '', confirmPassword: '' });
    } else {
      setEditingStaff(null);
      setFormData({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingStaff(null);
    setFormData({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (editingStaff) {
        if (formData.password) {
          const policyErrors = getPasswordPolicyErrors(formData.password);
          if (policyErrors.length > 0) {
            toast.error(policyErrors[0]);
            setFormLoading(false);
            return;
          }
          if (!formData.confirmPassword) {
            toast.error("Konfirmasi password wajib diisi");
            setFormLoading(false);
            return;
          }
          if (formData.password !== formData.confirmPassword) {
            toast.error("Konfirmasi password tidak cocok");
            setFormLoading(false);
            return;
          }
        }
        await api.put(`/staff/${editingStaff.id}`, formData);
        toast.success("Data staf berhasil diperbarui");
      } else {
        if (!formData.password) {
          toast.error("Password wajib diisi untuk staf baru");
          setFormLoading(false);
          return;
        }
        const policyErrors = getPasswordPolicyErrors(formData.password);
        if (policyErrors.length > 0) {
          toast.error(policyErrors[0]);
          setFormLoading(false);
          return;
        }
        if (!formData.confirmPassword) {
          toast.error("Konfirmasi password wajib diisi");
          setFormLoading(false);
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          toast.error("Konfirmasi password tidak cocok");
          setFormLoading(false);
          return;
        }
        if (!formData.phone) {
          toast.error("Nomor WhatsApp staf wajib diisi");
          setFormLoading(false);
          return;
        }
        await api.post('/staff', formData);
        toast.success("Staf baru berhasil ditambahkan");
      }
      fetchStaff();
      handleCloseModal();
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || "Terjadi kesalahan");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Yakin ingin menghapus staf ini?")) return;
    try {
      await api.delete(`/staff/${id}`);
      toast.success("Staf berhasil dihapus");
      fetchStaff();
    } catch {
      toast.error("Gagal menghapus staf");
    }
  };

  const filteredStaff = staff.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary tracking-tight">Manajemen Staf</h1>
          <p className="text-slate-500 font-medium mt-1">Kelola akun akses untuk karyawan Anda.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="premium-button flex items-center gap-2 px-6 py-3"
        >
          <UserPlus size={20} />
          <span>Tambah Staf Baru</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Cari nama atau email staf..." 
            className="premium-input bg-white premium-input-icon"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="glass-card bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-primary/5 text-primary border-b border-slate-100">
              <tr>
                <th className="px-8 py-5 font-black uppercase text-xs tracking-wider">Nama Staf</th>
                <th className="px-8 py-5 font-black uppercase text-xs tracking-wider">Email / Username</th>
                <th className="px-8 py-5 font-black uppercase text-xs tracking-wider">Dibuat Pada</th>
                <th className="px-8 py-5 font-black uppercase text-xs tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-8 py-20 text-center">
                    <Loader2 className="animate-spin mx-auto text-primary mb-2" size={32} />
                    <p className="text-slate-500 font-bold">Memuat data staf...</p>
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-8 py-20 text-center">
                    <p className="text-slate-400 font-bold">Tidak ada staf ditemukan.</p>
                  </td>
                </tr>
              ) : filteredStaff.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-tertiary/20 flex items-center justify-center text-primary font-black">
                        {s.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-primary">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="font-medium text-slate-600">{s.email}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">
                      {new Date(s.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleOpenModal(s)}
                        className="p-2 hover:bg-primary/5 text-primary rounded-lg transition-colors"
                        title="Edit / Ganti Password"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(s.id)}
                        className="p-2 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors"
                        title="Hapus Staf"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-primary text-white">
              <div>
                <h3 className="text-xl font-black">{editingStaff ? 'Edit Data Staf' : 'Tambah Staf Baru'}</h3>
                <p className="text-white/60 text-xs font-bold uppercase tracking-widest mt-1">
                  {editingStaff ? 'Perbarui akses karyawan' : 'Berikan akses sistem baru'}
                </p>
              </div>
              <button onClick={handleCloseModal} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nama Lengkap</label>
                  <div className="relative group">
                    <input 
                      required
                      type="text" 
                      className="premium-input bg-secondary premium-input-icon"
                      placeholder="Contoh: Budi Santoso"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                    <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Email / Username</label>
                  <div className="relative group">
                    <input 
                      required
                      type="email" 
                      className="premium-input bg-secondary premium-input-icon"
                      placeholder="budi@washpro.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nomor WhatsApp</label>
                  <div className="relative group">
                    <input
                      required={!editingStaff}
                      type="tel"
                      className="premium-input bg-secondary premium-input-icon"
                      placeholder="Contoh: 081234567890 / 628123..."
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                    <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" />
                  </div>
                </div>
                <div>
                  <PasswordInput
                    label={editingStaff ? 'Password Baru (Kosongkan jika tidak diubah)' : 'Password Awal'}
                    value={formData.password}
                    onChange={(v) => setFormData({ ...formData, password: v })}
                    required={!editingStaff}
                    showStrength
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                    {editingStaff ? 'Konfirmasi Password Baru' : 'Konfirmasi Password Awal'}
                  </label>
                  <input
                    required={!editingStaff}
                    type="password"
                    className="premium-input bg-secondary"
                    placeholder="Ulangi password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={handleCloseModal}
                  className="flex-1 px-6 py-4 border border-slate-200 rounded-2xl font-black text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={formLoading}
                  className="flex-[2] premium-button flex items-center justify-center gap-2"
                >
                  {formLoading ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                  <span>{editingStaff ? 'Simpan Perubahan' : 'Buat Akun Staf'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Toaster position="bottom-right" />
    </div>
  );
}
