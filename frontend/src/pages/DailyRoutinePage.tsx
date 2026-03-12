import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Save, Copy, Trash2, Plus, Send, ChevronLeft, AlertTriangle, Clock, GripVertical } from 'lucide-react';

interface Message {
  id: string;
  order: number;
  type: string;
  text: string;
  cta: string;
  mediaUrl: string;
  scheduledTime: string;
  destination: string;
  status: string;
  product?: { id: string; name: string };
}

interface Routine {
  id: string;
  date: string;
  status: string;
  objective: string;
  dailyGoal: string;
  notes: string;
  messageCount: number;
  campaign?: { id: string; name: string };
  focusProduct?: { id: string; name: string };
  messages: Message[];
}

const messageTypes = [
  { value: 'enquete', label: '📊 Enquete', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'pergunta', label: '❓ Pergunta', color: 'bg-violet-100 text-violet-700' },
  { value: 'conteudo', label: '📚 Conteúdo', color: 'bg-blue-100 text-blue-700' },
  { value: 'bastidor', label: '🎬 Bastidor', color: 'bg-amber-100 text-amber-700' },
  { value: 'prova_social', label: '⭐ Prova Social', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'receita', label: '🍳 Receita', color: 'bg-orange-100 text-orange-700' },
  { value: 'tutorial', label: '📱 Tutorial', color: 'bg-cyan-100 text-cyan-700' },
  { value: 'novidade', label: '🆕 Novidade', color: 'bg-teal-100 text-teal-700' },
  { value: 'reposicao', label: '🔄 Reposição', color: 'bg-lime-100 text-lime-700' },
  { value: 'oferta', label: '🏷️ Oferta', color: 'bg-green-100 text-green-700' },
  { value: 'urgencia', label: '⚡ Urgência', color: 'bg-red-100 text-red-700' },
  { value: 'fechamento', label: '🔒 Fechamento', color: 'bg-rose-100 text-rose-700' },
  { value: 'institucional', label: '🏢 Institucional', color: 'bg-gray-100 text-gray-700' },
  { value: 'chamada_site', label: '🌐 Chamada Site', color: 'bg-sky-100 text-sky-700' },
  { value: 'chamada_loja', label: '🏪 Chamada Loja', color: 'bg-pink-100 text-pink-700' },
];

const statusLabels: Record<string, string> = {
  rascunho: 'Rascunho',
  em_edicao: 'Em Edição',
  aprovado: 'Aprovado',
  agendado: 'Agendado',
  enviado: 'Enviado',
  cancelado: 'Cancelado',
};

export default function DailyRoutinePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/daily-routines/${id}`),
      api.get('/campaigns'),
      api.get('/products')
    ]).then(([routineRes, campRes, prodRes]) => {
      setRoutine(routineRes.data);
      setCampaigns(campRes.data);
      setProducts(prodRes.data);
      // Check alerts
      if (routineRes.data?.date) {
        const dateStr = routineRes.data.date.split('T')[0];
        api.get(`/alerts/check/${dateStr}`).then(r => setAlerts(r.data)).catch(() => {});
      }
    }).finally(() => setLoading(false));
  }, [id]);

  const updateRoutine = async (data: any) => {
    setSaving(true);
    try {
      const res = await api.put(`/daily-routines/${id}`, data);
      setRoutine(res.data);
    } finally {
      setSaving(false);
    }
  };

  const updateMessage = async (msgId: string, data: any) => {
    const res = await api.put(`/messages/${msgId}`, data);
    setRoutine(prev => prev ? {
      ...prev,
      messages: prev.messages.map(m => m.id === msgId ? { ...m, ...res.data } : m)
    } : null);
  };

  const addMessage = async () => {
    if (!routine || routine.messages.length >= 7) return;
    const res = await api.post(`/messages/routine/${id}`);
    setRoutine(prev => prev ? { ...prev, messages: [...prev.messages, res.data] } : null);
  };

  const deleteMessage = async (msgId: string) => {
    await api.delete(`/messages/${msgId}`);
    setRoutine(prev => prev ? {
      ...prev,
      messages: prev.messages.filter(m => m.id !== msgId).map((m, i) => ({ ...m, order: i + 1 }))
    } : null);
  };

  const sendMessage = async (msgId: string) => {
    const res = await api.post(`/messages/${msgId}/send`);
    setRoutine(prev => prev ? {
      ...prev,
      messages: prev.messages.map(m => m.id === msgId ? { ...m, ...res.data } : m)
    } : null);
  };

  const duplicateRoutine = async () => {
    const targetDate = prompt('Data destino (YYYY-MM-DD):');
    if (!targetDate) return;
    try {
      const res = await api.post(`/daily-routines/${id}/duplicate`, { targetDate });
      navigate(`/rotina/${res.data.id}`);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao duplicar');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full" /></div>;
  if (!routine) return <div className="text-center py-12 text-gray-500">Rotina não encontrada</div>;

  const typeInfo = (type: string) => messageTypes.find(t => t.value === type) || { label: type, color: 'bg-gray-100 text-gray-700' };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/calendario')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">
            Rotina — {format(new Date(routine.date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <select value={routine.status}
              onChange={e => updateRoutine({ status: e.target.value })}
              className="text-sm border rounded-lg px-2 py-1">
              {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            {routine.campaign && <span className="text-sm text-gray-500">📣 {routine.campaign.name}</span>}
            {routine.focusProduct && <span className="text-sm text-gray-500">📦 {routine.focusProduct.name}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={duplicateRoutine} className="flex items-center gap-1 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 transition">
            <Copy size={16} /> Duplicar
          </button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-700 font-medium">
            <AlertTriangle size={18} /> Alertas do Dia
          </div>
          {alerts.map((a: any, i: number) => (
            <p key={i} className="text-sm text-amber-700 ml-6">• {a.message}</p>
          ))}
        </div>
      )}

      {/* Routine config */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Campanha</label>
          <select value={routine.campaignId || ''}
            onChange={e => updateRoutine({ campaignId: e.target.value || null })}
            className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="">Sem campanha</option>
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Produto Foco</label>
          <select value={routine.focusProductId || ''}
            onChange={e => updateRoutine({ focusProductId: e.target.value || null })}
            className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="">Sem produto foco</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Objetivo do Dia</label>
          <input value={routine.objective || ''} placeholder="Ex: Apresentar novo produto"
            onChange={e => updateRoutine({ objective: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Meta do Dia</label>
          <input value={routine.dailyGoal || ''} placeholder="Ex: 5 mensagens de interesse"
            onChange={e => updateRoutine({ dailyGoal: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm text-gray-600 mb-1">Observações</label>
          <input value={routine.notes || ''} placeholder="Notas sobre o dia..."
            onChange={e => updateRoutine({ notes: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Mensagens ({routine.messages.length}/7)</h2>
          {routine.messages.length < 7 && (
            <button onClick={addMessage} className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 text-sm rounded-lg hover:bg-green-100 transition">
              <Plus size={16} /> Adicionar
            </button>
          )}
        </div>

        {routine.messages.sort((a, b) => a.order - b.order).map(msg => {
          const ti = typeInfo(msg.type);
          return (
            <div key={msg.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3 mb-3">
                <GripVertical size={16} className="text-gray-300" />
                <span className="text-sm font-bold text-gray-400">#{msg.order}</span>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${ti.color}`}>{ti.label}</span>
                <div className="flex items-center gap-1 text-gray-400">
                  <Clock size={14} />
                  <input type="time" value={msg.scheduledTime || ''}
                    onChange={e => updateMessage(msg.id, { scheduledTime: e.target.value })}
                    className="text-sm border-0 bg-transparent" />
                </div>
                <div className="flex-1" />
                <select value={msg.type}
                  onChange={e => updateMessage(msg.id, { type: e.target.value })}
                  className="text-xs border rounded px-2 py-1">
                  {messageTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                {msg.status !== 'enviado' && (
                  <button onClick={() => sendMessage(msg.id)} className="text-green-500 hover:text-green-700" title="Marcar como enviada">
                    <Send size={16} />
                  </button>
                )}
                {msg.status !== 'enviado' && (
                  <button onClick={() => deleteMessage(msg.id)} className="text-red-400 hover:text-red-600" title="Remover">
                    <Trash2 size={16} />
                  </button>
                )}
                {msg.status === 'enviado' && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Enviado</span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Texto da Mensagem</label>
                  <textarea value={msg.text || ''} rows={3} placeholder="Digite o texto da mensagem..."
                    onChange={e => updateMessage(msg.id, { text: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">CTA (Chamada para Ação)</label>
                    <input value={msg.cta || ''} placeholder="Ex: Peça pelo WhatsApp 📲"
                      onChange={e => updateMessage(msg.id, { cta: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Destino</label>
                    <select value={msg.destination}
                      onChange={e => updateMessage(msg.id, { destination: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2 text-sm">
                      <option value="grupo_vip">Grupo VIP</option>
                      <option value="instagram">Instagram</option>
                      <option value="whatsapp_api">WhatsApp API</option>
                      <option value="todos">Todos</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
