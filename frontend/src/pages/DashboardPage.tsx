import { useEffect, useState } from 'react';
import api from '../lib/api';
import {
  MessageSquare, Megaphone, Users, DollarSign, TrendingUp,
  Package, Calendar, AlertTriangle, Lightbulb
} from 'lucide-react';

interface DashboardData {
  totalMessages: number;
  sentMessages: number;
  activeCampaigns: number;
  leadsThisMonth: number;
  openLeads: number;
  closedLeads: number;
  totalProducts: number;
  revenueThisMonth: number;
  conversionRate: number;
  routinesThisMonth: number;
}

interface Suggestion {
  type: string;
  message: string;
  priority: string;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/metrics/dashboard'),
      api.get('/metrics/suggestions')
    ]).then(([dashRes, sugRes]) => {
      setData(dashRes.data);
      setSuggestions(sugRes.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full" /></div>;

  const cards = [
    { label: 'Mensagens Enviadas', value: data?.sentMessages || 0, total: data?.totalMessages, icon: MessageSquare, color: 'blue' },
    { label: 'Campanhas Ativas', value: data?.activeCampaigns || 0, icon: Megaphone, color: 'green' },
    { label: 'Leads no Mês', value: data?.leadsThisMonth || 0, icon: Users, color: 'purple' },
    { label: 'Leads Abertos', value: data?.openLeads || 0, icon: Users, color: 'amber' },
    { label: 'Vendas Fechadas', value: data?.closedLeads || 0, icon: TrendingUp, color: 'emerald' },
    { label: 'Faturamento do Mês', value: `R$ ${(data?.revenueThisMonth || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: DollarSign, color: 'green' },
    { label: 'Taxa de Conversão', value: `${data?.conversionRate || 0}%`, icon: TrendingUp, color: 'teal' },
    { label: 'Produtos Ativos', value: data?.totalProducts || 0, icon: Package, color: 'orange' },
    { label: 'Rotinas no Mês', value: data?.routinesThisMonth || 0, icon: Calendar, color: 'indigo' },
  ];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    teal: 'bg-teal-50 text-teal-600',
    orange: 'bg-orange-50 text-orange-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500">Visão geral da operação do Grupo VIP</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{card.value}</p>
                {card.total !== undefined && (
                  <p className="text-xs text-gray-400 mt-1">de {card.total} total</p>
                )}
              </div>
              <div className={`p-3 rounded-xl ${colorMap[card.color] || 'bg-gray-50 text-gray-600'}`}>
                <card.icon size={22} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sugestões Inteligentes */}
      {suggestions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="text-amber-500" size={20} />
            <h2 className="text-lg font-semibold text-gray-800">Sugestões Inteligentes</h2>
          </div>
          <div className="space-y-3">
            {suggestions.map((s, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${
                s.priority === 'alta' ? 'bg-red-50 border border-red-100' :
                s.priority === 'media' ? 'bg-amber-50 border border-amber-100' :
                'bg-blue-50 border border-blue-100'
              }`}>
                <AlertTriangle size={16} className={
                  s.priority === 'alta' ? 'text-red-500 mt-0.5' :
                  s.priority === 'media' ? 'text-amber-500 mt-0.5' :
                  'text-blue-500 mt-0.5'
                } />
                <p className="text-sm text-gray-700">{s.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
