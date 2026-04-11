import { useState, useEffect } from 'react';
import { Users, Edit, Trash2, Search, Save, X } from 'lucide-react';
import api from '../lib/axios';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/customers');
      setCustomers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.phone && c.phone.includes(search))
  );

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
      alert("Gagal menyimpan data pelanggan. Pastikan nomor HP tidak duplikat.");
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
     if(!window.confirm("Yakin ingin menghapus riwayat pelanggan ini?")) return;
     try {
       await api.delete(`/customers/${id}`);
       fetchCustomers();
     } catch (err) {
       alert("Gagal menghapus. Pelanggan ini mungkin sedang memiliki status transaksi aktif.");
     }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-primary tracking-tight flex items-center gap-2">
            CRM Pelanggan
          </h1>
          <p className="text-slate-500 mt-1">Kelola data pelanggan loyal Anda.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row w-full md:w-auto gap-4">
           {/* Pencarian */}
           <div className="relative w-full sm:w-64">
             <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
               <Search size={18} className="text-slate-400"/>
             </div>
             <input 
               type="text" 
               placeholder="Cari nama atau HP..."
               className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:border-primary outline-none text-primary transition-all text-sm font-medium shadow-sm"
               value={search}
               onChange={e => setSearch(e.target.value)}
             />
           </div>
        </div>
      </div>

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
               <input className="premium-input bg-secondary" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
             </div>
             <div>
               <label className="block text-sm font-bold text-slate-600 mb-2">Alamat Domisili</label>
               <input className="premium-input bg-secondary" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
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
                <th className="px-6 py-4">Informasi Pelanggan</th>
                <th className="px-6 py-4">Nomor Kontak</th>
                <th className="px-6 py-4">Alamat Terakhir</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-slate-500 text-base">Belum ada pelanggan ditemukan.</td>
                </tr>
              )}
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-primary/[0.02] transition-colors">
                  <td className="px-6 py-4">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-tertiary/20 text-tertiary-hover flex items-center justify-center font-bold">
                           {c.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-primary">{c.name}</span>
                     </div>
                  </td>
                  <td className="px-6 py-4 font-medium">{c.phone || '-'}</td>
                  <td className="px-6 py-4 text-slate-500 max-w-[200px] truncate">{c.address || '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleEdit(c)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mr-2">
                       <Edit size={18} />
                    </button>
                    <button onClick={() => handleDelete(c.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                       <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
