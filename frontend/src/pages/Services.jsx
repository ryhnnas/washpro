import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Save, X } from 'lucide-react';
import api from '../lib/axios';

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', price: '', type: 'KILOAN', unit: 'kg', estimateValue: 24, estimateUnit: 'HOUR' });
  const [isAdding, setIsAdding] = useState(false);

  const fetchServices = async () => {
    try {
      const res = await api.get('/services');
      setServices(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        price: parseInt(formData.price),
        estimateValue: parseInt(formData.estimateValue),
      };

      if (editingId) {
        await api.put(`/services/${editingId}`, payload);
      } else {
        await api.post('/services', payload);
      }
      
      setFormData({ name: '', price: '', type: 'KILOAN', unit: 'kg', estimateValue: 24, estimateUnit: 'HOUR' });
      setEditingId(null);
      setIsAdding(false);
      fetchServices();
    } catch (err) {
      alert("Gagal menyimpan layanan");
    }
    setLoading(false);
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
    if(!window.confirm("Yakin ingin menghapus layanan ini?")) return;
    try {
      await api.delete(`/services/${id}`);
      fetchServices();
    } catch (err) {
      alert(err.response?.data?.error || "Gagal menghapus layanan");
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h1 className="text-3xl font-bold text-primary tracking-tight">Manajemen Layanan</h1>
           <p className="text-slate-500 mt-1">Atur harga paket cucian, jenis layanan, dan tagihan kasir Anda.</p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => { setIsAdding(true); setEditingId(null); setFormData({ name: '', price: '', type: 'KILOAN', unit: 'kg', estimateValue: 24, estimateUnit: 'HOUR' }); }}
            className="flex items-center gap-2 px-5 py-3 bg-primary text-white hover:bg-primary-light font-bold rounded-xl shadow-lg transition-all"
          >
            <Plus size={20} /> Tambah Layanan Baru
          </button>
        )}
      </div>

      {isAdding && (
        <form onSubmit={handleSave} className="glass-card p-6 rounded-3xl border-t-primary relative">
          <button type="button" onClick={() => setIsAdding(false)} className="absolute top-6 right-6 text-slate-400 hover:text-rose-500 transition-colors">
            <X size={24} />
          </button>
          
          <h2 className="text-xl font-bold text-primary mb-6">{editingId ? 'Edit Layanan' : 'Tambah Layanan Baru'}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
             <div>
               <label className="block text-sm font-bold text-slate-600 mb-2">Nama Layanan</label>
               <input required placeholder="Contoh: Cuci Kilat" className="premium-input bg-secondary" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
             </div>
             <div>
               <label className="block text-sm font-bold text-slate-600 mb-2">Harga</label>
               <input required type="number" placeholder="5000" className="premium-input bg-secondary" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
             </div>
             <div>
               <label className="block text-sm font-bold text-slate-600 mb-2">Tipe Beban</label>
               <select required className="premium-input bg-secondary" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                 <option value="KILOAN">Kiloan</option>
                 <option value="SATUAN">Satuan</option>
               </select>
             </div>
             <div>
               <label className="block text-sm font-bold text-slate-600 mb-2">Unit (Satuan Ukur)</label>
               <input required placeholder="Contoh: kg, pcs, m2" className="premium-input bg-secondary" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} />
             </div>
             <div>
               <label className="block text-sm font-bold text-slate-600 mb-2">Estimasi Durasi</label>
               <input required type="number" min="1" className="premium-input bg-secondary" value={formData.estimateValue} onChange={e => setFormData({...formData, estimateValue: e.target.value})} />
             </div>
             <div>
               <label className="block text-sm font-bold text-slate-600 mb-2">Unit Estimasi</label>
               <select required className="premium-input bg-secondary" value={formData.estimateUnit} onChange={e => setFormData({...formData, estimateUnit: e.target.value})}>
                 <option value="HOUR">Jam</option>
                 <option value="DAY">Hari</option>
               </select>
             </div>
          </div>
          <button type="submit" disabled={loading} className="premium-button text-sm md:text-base w-full md:w-auto px-8">
             <Save size={18} /> {loading ? "Menyimpan..." : "Simpan Layanan"}
          </button>
        </form>
      )}

      <div className="glass-card rounded-3xl overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-primary/5 text-primary font-bold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Nama Layanan</th>
                <th className="px-6 py-4">Tipe Beban</th>
                <th className="px-6 py-4">Harga / Unit</th>
                <th className="px-6 py-4">Estimasi</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {services.map((svc) => (
                <tr key={svc.id} className="hover:bg-primary/[0.02] transition-colors">
                  <td className="px-6 py-4 font-bold text-primary">{svc.name}</td>
                  <td className="px-6 py-4">
                     <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${svc.type === 'KILOAN' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                       {svc.type}
                     </span>
                  </td>
                  <td className="px-6 py-4 font-semibold">Rp {svc.price.toLocaleString('id-ID')} / {svc.unit}</td>
                  <td className="px-6 py-4 font-semibold">{svc.estimateValue} {svc.estimateUnit === 'DAY' ? 'hari' : 'jam'}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleEdit(svc)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mr-2">
                       <Edit size={18} />
                    </button>
                    <button onClick={() => handleDelete(svc.id)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                       <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {services.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">Belum ada layanan yang ditambahkan.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
