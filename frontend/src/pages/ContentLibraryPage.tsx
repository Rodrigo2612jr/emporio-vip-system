import { useEffect, useState } from 'react';
import api from '../lib/api';
import { Plus, Search, Edit2, Trash2, X, BookOpen } from 'lucide-react';

const categories = [
  'energia_natural', 'intestino_saudavel', 'imunidade', 'relaxamento',
  'snacks_saudaveis', 'chocolates_especiais', 'chas_ervas', 'graos_cereais',
  'farinhas', 'sementes', 'castanhas_oleaginosas', 'mel_derivados',
  'suplementos', 'temperos', 'organicos', 'receitas', 'bastidores',
  'tutorial_compra', 'grupo_vip', 'ofertas', 'sazonalidades'
];

const categoryLabels: Record<string, string> = {
  energia_natural: 'Energia Natural', intestino_saudavel: 'Intestino Saudável',
  imunidade: 'Imunidade', relaxamento: 'Relaxamento',
  snacks_saudaveis: 'Snacks Saudáveis', chocolates_especiais: 'Chocolates Especiais',
  chas_ervas: 'Chás e Ervas', graos_cereais: 'Grãos e Cereais',
  farinhas: 'Farinhas', sementes: 'Sementes',
  castanhas_oleaginosas: 'Castanhas e Oleaginosas', mel_derivados: 'Mel e Derivados',
  suplementos: 'Suplementos', temperos: 'Temperos',
  organicos: 'Orgânicos', receitas: 'Receitas', bastidores: 'Bastidores',
  tutorial_compra: 'Tutorial de Compra', grupo_vip: 'Grupo VIP',
  ofertas: 'Ofertas', sazonalidades: 'Sazonalidades'
};

export default function ContentLibraryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState({ category: '', search: '' });
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    title: '', category: 'ofertas', subtype: '', text: '', cta: '',
    objective: '', mentalTrigger: '', format: '', tags: ''
  });

  const load = () => {
    api.get('/content', { params: { category: filter.category || undefined, search: filter.search || undefined } })
      .then(res => setItems(res.data));
  };

  useEffect(() => { load(); }, [filter]);

  const save = async () => {
    const data = { ...form, tags: form.tags ? form.tags.split(',').map(t => t.trim()) : undefined };
    if (editing) {
      await api.put(`/content/${editing.id}`, data);
    } else {
      await api.post('/content', data);
    }
    setShowForm(false);
    setEditing(null);
    setForm({ title: '', category: 'ofertas', subtype: '', text: '', cta: '', objective: '', mentalTrigger: '', format: '', tags: '' });
    load();
  };

  const edit = (item: any) => {
    setEditing(item);
    setForm({
      title: item.title, category: item.category, subtype: item.subtype || '',
      text: item.text, cta: item.cta || '', objective: item.objective || '',
      mentalTrigger: item.mentalTrigger || '', format: item.format || '',
      tags: item.tags ? JSON.parse(item.tags).join(', ') : ''
    });
    setShowForm(true);
  };

  const remove = async (id: string) => {
    if (!confirm('Remover este conteúdo?')) return;
    await api.delete(`/content/${id}`);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Biblioteca de Conteúdo</h1>
          <p className="text-gray-500">Textos, copys, CTAs e roteiros prontos para uso</p>
        </div>
        <button onClick={() => { setEditing(null); setForm({ title: '', category: 'ofertas', subtype: '', text: '', cta: '', objective: '', mentalTrigger: '', format: '', tags: '' }); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm">
          <Plus size={18} /> Novo Conteúdo
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
          <input type="text" value={filter.search} onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
            placeholder="Buscar por título, texto ou tags..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" />
        </div>
        <select value={filter.category} onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}
          className="border rounded-lg px-3 py-2 text-sm">
          <option value="">Todas categorias</option>
          {categories.map(c => <option key={c} value={c}>{categoryLabels[c] || c}</option>)}
        </select>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item => (
          <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-gray-800">{item.title}</h3>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  {categoryLabels[item.category] || item.category}
                </span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => edit(item)} className="p-1 hover:bg-gray-100 rounded"><Edit2 size={14} /></button>
                <button onClick={() => remove(item.id)} className="p-1 hover:bg-red-50 rounded text-red-400"><Trash2 size={14} /></button>
              </div>
            </div>
            <p className="text-sm text-gray-600 line-clamp-3 mb-2">{item.text}</p>
            {item.cta && <p className="text-xs text-green-600 font-medium">CTA: {item.cta}</p>}
            {item.mentalTrigger && <p className="text-xs text-purple-500 mt-1">🧠 {item.mentalTrigger}</p>}
            <div className="flex items-center justify-between mt-3 pt-2 border-t">
              <span className="text-xs text-gray-400">Usado {item.usageCount}x</span>
              {item.product && <span className="text-xs text-gray-500">📦 {item.product.name}</span>}
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">
            <BookOpen size={40} className="mx-auto mb-2 opacity-50" />
            Nenhum conteúdo encontrado
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">{editing ? 'Editar Conteúdo' : 'Novo Conteúdo'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Título *</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Categoria *</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm">
                    {categories.map(c => <option key={c} value={c}>{categoryLabels[c] || c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Texto *</label>
                <textarea value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
                  rows={4} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">CTA</label>
                  <input value={form.cta} onChange={e => setForm(f => ({ ...f, cta: e.target.value }))}
                    placeholder="Ex: Peça agora pelo WhatsApp 📲"
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Gatilho Mental</label>
                  <input value={form.mentalTrigger} onChange={e => setForm(f => ({ ...f, mentalTrigger: e.target.value }))}
                    placeholder="Ex: Escassez, Urgência, Prova Social"
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Objetivo</label>
                  <input value={form.objective} onChange={e => setForm(f => ({ ...f, objective: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Tags (separadas por vírgula)</label>
                  <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                    placeholder="saudável, energia, manhã"
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <button onClick={save} className="w-full py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition">
                {editing ? 'Salvar Alterações' : 'Criar Conteúdo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
