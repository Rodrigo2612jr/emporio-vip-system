import { useEffect, useState } from 'react';
import api from '../lib/api';
import { BarChart3, TrendingUp, Package, Megaphone } from 'lucide-react';

export default function ReportsPage() {
  const [campaignMetrics, setCampaignMetrics] = useState<any[]>([]);
  const [productMetrics, setProductMetrics] = useState<any[]>([]);
  const [period, setPeriod] = useState('30');

  useEffect(() => {
    Promise.all([
      api.get('/metrics/campaigns', { params: { days: period } }),
      api.get('/metrics/products', { params: { days: period } })
    ]).then(([cRes, pRes]) => {
      setCampaignMetrics(cRes.data);
      setProductMetrics(pRes.data);
    });
  }, [period]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Relatórios</h1>
          <p className="text-gray-500">Análise de desempenho de campanhas e produtos</p>
        </div>
        <select value={period} onChange={e => setPeriod(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm">
          <option value="7">Últimos 7 dias</option>
          <option value="15">Últimos 15 dias</option>
          <option value="30">Últimos 30 dias</option>
          <option value="60">Últimos 60 dias</option>
          <option value="90">Últimos 90 dias</option>
        </select>
      </div>

      {/* Campaign Performance */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Megaphone size={20} className="text-purple-500" /> Desempenho por Campanha
        </h2>
        {campaignMetrics.length === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">Nenhuma campanha com dados no período</p>
        ) : (
          <div className="space-y-4">
            {campaignMetrics.map((c: any) => {
                const maxMessages = Math.max(...campaignMetrics.map((m: any) => m.totalMessages || 1));
                const barWidth = ((c.totalMessages || 0) / maxMessages) * 100;
                return (
                  <div key={c.campaignId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-800">{c.campaignName}</h3>
                      <span className="text-xs text-gray-400">{c.status}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-gray-500">Rotinas</p>
                        <p className="text-lg font-bold text-gray-800">{c.routineCount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Mensagens</p>
                        <p className="text-lg font-bold text-gray-800">{c.totalMessages}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Enviadas</p>
                        <p className="text-lg font-bold text-green-600">{c.sentMessages}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Leads</p>
                        <p className="text-lg font-bold text-purple-600">{c.leadCount}</p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: `${barWidth}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Product Performance */}
      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Package size={20} className="text-green-500" /> Desempenho por Produto
        </h2>
        {productMetrics.length === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">Nenhum produto com dados no período</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Produto</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Categoria</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Campanhas</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Menções</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Leads</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Mídias</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {productMetrics.map((p: any) => (
                  <tr key={p.productId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{p.productName}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{p.category || '—'}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-800">{p.campaignCount}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-800">{p.mentionCount}</td>
                    <td className="px-4 py-3 text-sm text-right text-purple-600 font-medium">{p.leadCount}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-800">{p.mediaCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
