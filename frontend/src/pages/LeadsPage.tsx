import { useEffect, useState } from 'react';
import api from '../lib/api';
import { Plus, Search, X, Users, Phone, MessageSquare, Trash2, Edit2, Save } from 'lucide-react';
import { format } from 'date-fns';

const statusConfig: Record<string, { label: string; color: string }> = {
  novo: { label: 'Novo Lead', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  em_atendimento: { label: 'Em Atendimento', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  aguardando_resposta: { label: 'Aguardando Resposta', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  aguardando_pagamento: { label: 'Aguardando Pagamento', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  fechado: { label: 'Fechado ✓', color: 'bg-green-100 text-green-700 border-green-200' },
  perdido: { label: 'Perdido', color: 'bg-red-100 text-red-700 border-red-200' },
};

const pipelineOrder = ['novo', 'em_atendimento', 'aguardando_resposta', 'aguardando_pagamento', 'fechado', 'perdido'];

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [filter, setFilter] = useState({ status: '', search: '' });
  const [showForm, setShowForm] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [pipeline, setPipeline] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'pipeline' | 'list'>('pipeline');
  const [form, setForm] = useState({ name: '', phone: '', campaignId: '', productId: '', sourceMessage: '', salePotential: 'medio' });
  const [editForm, setEditForm] = useState({ name: '', phone: '', notes: '', saleValue: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [historyNote, setHistoryNote] = useState('');

  const load = () => {
    Promise.all([
      api.get('/leads', { params: { status: filter.status || undefined, search: filter.search || undefined } }),
      api.get('/campaigns'),
      api.get('/products'),
      api.get('/leads/meta/pipeline')
    ]).then(([leadsRes, campRes, prodRes, pipeRes]) => {
      setLeads(leadsRes.data);
      setCampaigns(campRes.data);
      setProducts(prodRes.data);
      setPipeline(pipeRes.data);
    });
  };

  useEffect(() => { load(); }, [filter]);

  const save = async () => {
    try {
      await api.post('/leads', { ...form, campaignId: form.campaignId || null, productId: form.productId || null });
      setShowForm(false);
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao criar lead');
    }
  };

  const updateStatus = async (leadId: string, status: string) => {
    await api.put(`/leads/${leadId}`, { status });
    load();
  };

  const openLead = async (id: string) => {
    const res = await api.get(`/leads/${id}`);
    setSelectedLead(res.data);
    setEditForm({ name: res.data.name || '', phone: res.data.phone || '', notes: res.data.notes || '', saleValue: res.data.saleValue?.toString() || '' });
    setIsEditing(false);
    setHistoryNote('');
  };

  const deleteLead = async (id: string) => {
    if (!confirm('Remover este lead?')) return;
    await api.delete(`/leads/${id}`);
    setSelectedLead(null);
    load();
  };

  const saveLeadEdit = async () => {
    if (!selectedLead) return;
    const res = await api.put(`/leads/${selectedLead.id}`, {
      name: editForm.name, phone: editForm.phone, notes: editForm.notes,
      saleValue: editForm.saleValue ? parseFloat(editForm.saleValue) : null
    });
    setSelectedLead(res.data);
    setIsEditing(false);
    load();
  };

  const addHistoryNote = async () => {
    if (!selectedLead || !historyNote.trim()) return;
    await api.post(`/leads/${selectedLead.id}/history`, { action: 'Nota', details: historyNote });
    setHistoryNote('');
    const res = await api.get(`/leads/${selectedLead.id}`);
    setSelectedLead(res.data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Atendimento & Leads</h1>
          <p className="text-gray-500">Pipeline de vendas do grupo VIP</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setViewMode(viewMode === 'pipeline' ? 'list' : 'pipeline')}
            className="px-3 py-2 border rounded-lg text-sm hover:bg-gray-50">
            {viewMode === 'pipeline' ? 'Ver Lista' : 'Ver Pipeline'}
          </button>
          <button onClick={() => { setForm({ name: '', phone: '', campaignId: '', productId: '', sourceMessage: '', salePotential: 'medio' }); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm">
            <Plus size={18} /> Novo Lead
          </button>
        </div>
      </div>

      {/* Pipeline Summary */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {pipeline.map(p => {
          const cfg = statusConfig[p.status];
          return (
            <div key={p.status} className={`rounded-lg border p-3 ${cfg?.color || 'bg-gray-100'}`}>
              <p className="text-lg font-bold">{p.count}</p>
              <p className="text-xs">{cfg?.label || p.status}</p>
            </div>
          );
        })}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
          <input type="text" value={filter.search} onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
            placeholder="Buscar lead..." className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" />
        </div>
      </div>

      {/* Pipeline View */}
      {viewMode === 'pipeline' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {pipelineOrder.map(status => {
            const cfg = statusConfig[status];
            const statusLeads = leads.filter(l => l.status === status);
            return (
              <div key={status} className="bg-gray-50 rounded-xl p-3">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center justify-between">
                  {cfg?.label}
                  <span className="bg-white text-gray-500 text-xs px-2 py-0.5 rounded-full">{statusLeads.length}</span>
                </h3>
                <div className="space-y-2">
                  {statusLeads.map(lead => (
                    <div key={lead.id} onClick={() => openLead(lead.id)}
                      className="bg-white rounded-lg border p-3 cursor-pointer hover:shadow-md transition">
                      <p className="font-medium text-sm text-gray-800">{lead.name}</p>
                      {lead.phone && <p className="text-xs text-gray-500 flex items-center gap-1"><Phone size={10} /> {lead.phone}</p>}
                      {lead.campaign && <p className="text-xs text-purple-500 mt-1">📣 {lead.campaign.name}</p>}
                      {lead.product && <p className="text-xs text-green-600">📦 {lead.product.name}</p>}
                      <p className="text-[10px] text-gray-400 mt-1">{format(new Date(lead.createdAt), 'dd/MM HH:mm')}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Lead</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Telefone</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Campanha</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Produto</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {leads.map(lead => (
                <tr key={lead.id} onClick={() => openLead(lead.id)} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{lead.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{lead.phone || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{lead.campaign?.name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{lead.product?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <select value={lead.status} onClick={e => e.stopPropagation()}
                      onChange={e => updateStatus(lead.id, e.target.value)}
                      className="text-xs border rounded px-2 py-1">
                      {pipelineOrder.map(s => <option key={s} value={s}>{statusConfig[s]?.label || s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{format(new Date(lead.createdAt), 'dd/MM HH:mm')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Lead Detail Modal */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{selectedLead.name}</h2>
              <div className="flex items-center gap-1">
                <button onClick={() => setIsEditing(!isEditing)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500" title="Editar">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => deleteLead(selectedLead.id)} className="p-1.5 hover:bg-red-50 rounded text-red-400" title="Remover">
                  <Trash2 size={16} />
                </button>
                <button onClick={() => setSelectedLead(null)} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
              </div>
            </div>
            <div className="space-y-3">
              {isEditing ? (
                <>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Nome</label>
                    <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Telefone</label>
                    <input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Valor da Venda (R$)</label>
                    <input type="number" step="0.01" value={editForm.saleValue} onChange={e => setEditForm(f => ({ ...f, saleValue: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Observações</label>
                    <textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={3} className="w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <button onClick={saveLeadEdit} className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition flex items-center justify-center gap-2">
                    <Save size={16} /> Salvar Alterações
                  </button>
                </>
              ) : (
                <>
                  {selectedLead.phone && <p className="text-sm flex items-center gap-2"><Phone size={14} /> {selectedLead.phone}</p>}
                  {selectedLead.campaign && <p className="text-sm">📣 Campanha: {selectedLead.campaign.name}</p>}
                  {selectedLead.product && <p className="text-sm">📦 Produto: {selectedLead.product.name}</p>}
                  {selectedLead.sourceMessage && <p className="text-sm bg-gray-50 p-2 rounded">💬 "{selectedLead.sourceMessage}"</p>}
                  {selectedLead.saleValue && <p className="text-sm font-medium text-green-600">💰 R$ {selectedLead.saleValue.toFixed(2)}</p>}
                  {selectedLead.notes && <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{selectedLead.notes}</p>}
                </>
              )}
              <div>
                <label className="block text-sm text-gray-600 mb-1">Status</label>
                <select value={selectedLead.status}
                  onChange={async (e) => {
                    await updateStatus(selectedLead.id, e.target.value);
                    setSelectedLead({ ...selectedLead, status: e.target.value });
                  }}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  {pipelineOrder.map(s => <option key={s} value={s}>{statusConfig[s]?.label || s}</option>)}
                </select>
              </div>

              {/* Add history note */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Adicionar Nota</label>
                <div className="flex gap-2">
                  <input value={historyNote} onChange={e => setHistoryNote(e.target.value)}
                    placeholder="Escreva uma observação..." className="flex-1 border rounded-lg px-3 py-2 text-sm"
                    onKeyDown={e => e.key === 'Enter' && addHistoryNote()} />
                  <button onClick={addHistoryNote} disabled={!historyNote.trim()}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50">
                    Salvar
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Histórico</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedLead.history?.length === 0 && <p className="text-xs text-gray-400">Nenhum histórico</p>}
                  {selectedLead.history?.map((h: any) => (
                    <div key={h.id} className="text-xs text-gray-600 border-l-2 border-green-300 pl-3 py-1">
                      <p className="font-medium">{h.action}</p>
                      {h.details && <p className="text-gray-400">{h.details}</p>}
                      <p className="text-gray-400">{format(new Date(h.createdAt), 'dd/MM/yyyy HH:mm')}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Lead Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Novo Lead</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Nome *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Telefone</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Campanha de Origem</label>
                <select value={form.campaignId} onChange={e => setForm(f => ({ ...f, campaignId: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Sem campanha</option>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Produto de Interesse</label>
                <select value={form.productId} onChange={e => setForm(f => ({ ...f, productId: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Sem produto</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Mensagem de Origem</label>
                <input value={form.sourceMessage} onChange={e => setForm(f => ({ ...f, sourceMessage: e.target.value }))}
                  placeholder='Ex: "Quero saber o preço"' className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <button onClick={save} className="w-full py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition">
                Criar Lead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
