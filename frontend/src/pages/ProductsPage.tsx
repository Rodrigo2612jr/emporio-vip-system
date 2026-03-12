import { useEffect, useState } from 'react';
import api from '../lib/api';
import { Plus, Search, Edit2, Trash2, X, Package } from 'lucide-react';

const productCategories = [
  'adocantes_naturais', 'castanhas', 'oleaginosas', 'frutas_secas', 'chips', 'snacks',
  'chocolates_especiais', 'trufados', 'chas', 'chimarrao', 'cosmeticos', 'ervas',
  'farinhas', 'frutas_especiais', 'granolas', 'cereais', 'graos', 'meles_derivados',
  'mercearia', 'organicos', 'suplementos', 'temperos'
];

const catLabels: Record<string, string> = {
  adocantes_naturais: 'Adoçantes Naturais', castanhas: 'Castanhas', oleaginosas: 'Oleaginosas',
  frutas_secas: 'Frutas Secas', chips: 'Chips', snacks: 'Snacks',
  chocolates_especiais: 'Chocolates Especiais', trufados: 'Trufados',
  chas: 'Chás', chimarrao: 'Chimarrão', cosmeticos: 'Cosméticos', ervas: 'Ervas',
  farinhas: 'Farinhas', frutas_especiais: 'Frutas Especiais',
  granolas: 'Granolas', cereais: 'Cereais', graos: 'Grãos', meles_derivados: 'Méis e Derivados',
  mercearia: 'Mercearia', organicos: 'Orgânicos', suplementos: 'Suplementos', temperos: 'Temperos'
};

export default function ProductsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState({ category: '', search: '' });
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    name: '', category: 'castanhas', shortDescription: '', benefits: '',
    applications: '', price: '', promoPrice: '', tags: '', status: 'ativo'
  });

  const load = () => {
    api.get('/products', { params: { category: filter.category || undefined, search: filter.search || undefined } })
      .then(res => setItems(res.data));
  };

  useEffect(() => { load(); }, [filter]);

  const save = async () => {
    const data = {
      ...form,
      price: form.price ? parseFloat(form.price) : null,
      promoPrice: form.promoPrice ? parseFloat(form.promoPrice) : null,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()) : undefined
    };
    if (editing) {
      await api.put(`/products/${editing.id}`, data);
    } else {
      await api.post('/products', data);
    }
    setShowForm(false);
    setEditing(null);
    load();
  };

  const edit = (item: any) => {
    setEditing(item);
    setForm({
      name: item.name, category: item.category, shortDescription: item.shortDescription || '',
      benefits: item.benefits || '', applications: item.applications || '',
      price: item.price?.toString() || '', promoPrice: item.promoPrice?.toString() || '',
      tags: item.tags ? JSON.parse(item.tags).join(', ') : '', status: item.status
    });
    setShowForm(true);
  };

  const remove = async (id: string) => {
    if (!confirm('Remover este produto?')) return;
    await api.delete(`/products/${id}`);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Produtos</h1>
          <p className="text-gray-500">Cadastro e gestão de produtos do empório</p>
        </div>
        <button onClick={() => { setEditing(null); setForm({ name: '', category: 'castanhas', shortDescription: '', benefits: '', applications: '', price: '', promoPrice: '', tags: '', status: 'ativo' }); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm">
          <Plus size={18} /> Novo Produto
        </button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
          <input type="text" value={filter.search} onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
            placeholder="Buscar produto..." className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" />
        </div>
        <select value={filter.category} onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}
          className="border rounded-lg px-3 py-2 text-sm">
          <option value="">Todas categorias</option>
          {productCategories.map(c => <option key={c} value={c}>{catLabels[c] || c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Produto</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Categoria</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Preço</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Promo</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-gray-50 transition">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800">{item.name}</p>
                  {item.shortDescription && <p className="text-xs text-gray-500 truncate max-w-xs">{item.shortDescription}</p>}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    {catLabels[item.category] || item.category}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {item.price ? `R$ ${item.price.toFixed(2)}` : '—'}
                </td>
                <td className="px-4 py-3 text-sm text-green-600 font-medium">
                  {item.promoPrice ? `R$ ${item.promoPrice.toFixed(2)}` : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    item.status === 'ativo' ? 'bg-green-100 text-green-700' :
                    item.status === 'promocao' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>{item.status}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => edit(item)} className="p-1 hover:bg-gray-100 rounded"><Edit2 size={14} /></button>
                  <button onClick={() => remove(item.id)} className="p-1 hover:bg-red-50 rounded text-red-400 ml-1"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Package size={40} className="mx-auto mb-2 opacity-50" />
            Nenhum produto encontrado
          </div>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editing ? 'Editar Produto' : 'Novo Produto'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Nome *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Categoria *</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                    {productCategories.map(c => <option key={c} value={c}>{catLabels[c] || c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Descrição Curta</label>
                <input value={form.shortDescription} onChange={e => setForm(f => ({ ...f, shortDescription: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Benefícios</label>
                <textarea value={form.benefits} onChange={e => setForm(f => ({ ...f, benefits: e.target.value }))} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Preço (R$)</label>
                  <input type="number" step="0.01" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Preço Promo (R$)</label>
                  <input type="number" step="0.01" value={form.promoPrice} onChange={e => setForm(f => ({ ...f, promoPrice: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                    <option value="promocao">Em Promoção</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Tags (separadas por vírgula)</label>
                <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <button onClick={save} className="w-full py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition">
                {editing ? 'Salvar' : 'Criar Produto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
