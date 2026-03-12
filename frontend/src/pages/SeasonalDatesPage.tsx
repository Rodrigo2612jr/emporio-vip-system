import { useEffect, useState } from 'react';
import api from '../lib/api';
import { Calendar, Plus, X, Sparkles, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function SeasonalDatesPage() {
  const [dates, setDates] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', date: '', type: 'sazonal', description: '' });
  const [seeding, setSeeding] = useState(false);

  const load = () => {
    api.get('/seasonal').then(res => setDates(res.data));
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    await api.post('/seasonal', form);
    setShowForm(false);
    setForm({ name: '', date: '', type: 'sazonal', description: '' });
    load();
  };

  const remove = async (id: string) => {
    await api.delete(`/seasonal/${id}`);
    load();
  };

  const seed = async () => {
    setSeeding(true);
    try {
      await api.post('/seasonal/seed');
      load();
    } finally {
      setSeeding(false);
    }
  };

  const upcoming = dates.filter(d => new Date(d.date + 'T23:59:59') >= new Date()).sort((a, b) => a.date.localeCompare(b.date));
  const past = dates.filter(d => new Date(d.date + 'T23:59:59') < new Date()).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Datas Sazonais</h1>
          <p className="text-gray-500">Datas comemorativas para planejamento de campanhas</p>
        </div>
        <div className="flex gap-2">
          <button onClick={seed} disabled={seeding}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 transition disabled:opacity-50">
            <Sparkles size={16} /> {seeding ? 'Carregando...' : 'Carregar Datas BR'}
          </button>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm">
            <Plus size={18} /> Nova Data
          </button>
        </div>
      </div>

      {dates.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border">
          <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-lg font-medium text-gray-800 mb-2">Nenhuma data cadastrada</p>
          <p className="text-gray-500 mb-4">Clique em "Carregar Datas BR" para adicionar datas sazonais brasileiras</p>
          <button onClick={seed} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition">
            <Sparkles size={14} className="inline mr-1" /> Carregar Datas
          </button>
        </div>
      ) : (
        <>
          {/* Upcoming */}
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">📅 Próximas Datas ({upcoming.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {upcoming.map(d => {
                const dateObj = new Date(d.date + 'T12:00:00');
                const daysUntil = Math.ceil((dateObj.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={d.id} className="bg-white rounded-xl border p-4 hover:shadow-md transition">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-800">{d.name}</p>
                        <p className="text-sm text-gray-500">{format(dateObj, "dd 'de' MMMM", { locale: ptBR })}</p>
                        {d.description && <p className="text-xs text-gray-400 mt-1">{d.description}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          daysUntil <= 7 ? 'bg-red-100 text-red-700' :
                          daysUntil <= 30 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {daysUntil === 0 ? 'Hoje!' : daysUntil === 1 ? 'Amanhã' : `${daysUntil}d`}
                        </span>
                        <button onClick={() => remove(d.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Past */}
          {past.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-400 mb-3">Datas Passadas ({past.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {past.map(d => (
                  <div key={d.id} className="bg-gray-50 rounded-xl border border-gray-200 p-4 opacity-60">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-600">{d.name}</p>
                        <p className="text-sm text-gray-400">{format(new Date(d.date + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR })}</p>
                      </div>
                      <button onClick={() => remove(d.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Nova Data Sazonal</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Nome *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Ex: Dia das Mães" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Data *</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Tipo</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="sazonal">Sazonal</option>
                  <option value="comemorativa">Comemorativa</option>
                  <option value="promocional">Promocional</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Descrição</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
              </div>
              <button onClick={save} className="w-full py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition">
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
