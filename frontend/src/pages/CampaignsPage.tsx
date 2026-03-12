import { useEffect, useState } from 'react';
import api from '../lib/api';
import { Plus, Search, Edit2, Trash2, X, Megaphone } from 'lucide-react';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  rascunho: 'bg-gray-200 text-gray-700',
  ativa: 'bg-green-200 text-green-800',
  pausada: 'bg-yellow-200 text-yellow-800',
  finalizada: 'bg-blue-200 text-blue-800',
  cancelada: 'bg-red-200 text-red-800',
};

export default function CampaignsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [filter, setFilter] = useState({ status: '', search: '' });
  const [form, setForm] = useState({
    name: '', description: '', startDate: '', endDate: '', goal: '',
    objective: '', mainTrigger: '', anchorProductId: '', status: 'rascunho'
  });

  const load = () => {
    Promise.all([
      api.get('/campaigns', { params: { status: filter.status || undefined, search: filter.search || undefined } }),
      api.get('/products')
    ]).then(([campRes, prodRes]) => {
      setItems(campRes.data);
      setProducts(prodRes.data);
    });
  };

  useEffect(() => { load(); }, [filter]);

  const save = async () => {
    const data = { ...form, anchorProductId: form.anchorProductId || null };
    if (editing) {
      await api.put(`/campaigns/${editing.id}`, data);
    } else {
      await api.post('/campaigns', data);
    }
    setShowForm(false);
    setEditing(null);
    load();
  };

  const edit = (item: any) => {
    setEditing(item);
    setForm({
      name: item.name, description: item.description || '',
      startDate: item.startDate?.split('T')[0] || '', endDate: item.endDate?.split('T')[0] || '',
      goal: item.goal || '', objective: item.objective || '',
      mainTrigger: item.mainTrigger || '', anchorProductId: item.anchorProductId || '',
      status: item.status
    });
    setShowForm(true);
  };

  const remove = async (id: string) => {
    if (!confirm('Remover esta campanha?')) return;
    await api.delete(`/campaigns/${id}`);
    load();
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', description: '', startDate: '', endDate: '', goal: '', objective: '', mainTrigger: '', anchorProductId: '', status: 'rascunho' });
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Campanhas</h1>
          <p className="text-gray-500">Gerencie suas campanhas de vendas</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm">
          <Plus size={18} /> Nova Campanha
        </button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
          <input type="text" value={filter.search} onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
            placeholder="Buscar campanha..." className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" />
        </div>
        <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
          className="border rounded-lg px-3 py-2 text-sm">
          <option value="">Todos os status</option>
          <option value="rascunho">Rascunho</option>
          <option value="ativa">Ativa</option>
          <option value="pausada">Pausada</option>
          <option value="finalizada">Finalizada</option>
          <option value="cancelada">Cancelada</option>
        </select>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item => (
          <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-800">{item.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {item.startDate && format(new Date(item.startDate), 'dd/MM')} — {item.endDate && format(new Date(item.endDate), 'dd/MM/yyyy')}
                </p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[item.status] || 'bg-gray-100'}`}>
                {item.status}
              </span>
            </div>
            {item.description && <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.description}</p>}
            {item.goal && <p className="text-xs text-purple-600 mb-1">🎯 {item.goal}</p>}
            {item.anchorProduct && <p className="text-xs text-gray-500">📦 {item.anchorProduct.name}</p>}
            {item.mainTrigger && <p className="text-xs text-amber-600 mt-1">⚡ {item.mainTrigger}</p>}
            <div className="flex justify-end gap-1 mt-3 pt-2 border-t">
              <button onClick={() => edit(item)} className="p-1.5 hover:bg-gray-100 rounded"><Edit2 size={14} /></button>
              <button onClick={() => remove(item.id)} className="p-1.5 hover:bg-red-50 rounded text-red-400"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">
            <Megaphone size={40} className="mx-auto mb-2 opacity-50" />
            Nenhuma campanha encontrada
          </div>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editing ? 'Editar Campanha' : 'Nova Campanha'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Nome *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Descrição</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Data Início *</label>
                  <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Data Fim *</label>
                  <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Meta</label>
                  <input value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))} placeholder="Ex: 20 vendas" className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Objetivo</label>
                  <input value={form.objective} onChange={e => setForm(f => ({ ...f, objective: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Gatilho Principal</label>
                  <input value={form.mainTrigger} onChange={e => setForm(f => ({ ...f, mainTrigger: e.target.value }))} placeholder="Ex: Escassez" className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Produto Âncora</label>
                  <select value={form.anchorProductId} onChange={e => setForm(f => ({ ...f, anchorProductId: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="">Sem produto</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="rascunho">Rascunho</option>
                  <option value="ativa">Ativa</option>
                  <option value="pausada">Pausada</option>
                  <option value="finalizada">Finalizada</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
              <button onClick={save} className="w-full py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition">
                {editing ? 'Salvar' : 'Criar Campanha'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
