import { useEffect, useState } from 'react';
import api from '../lib/api';
import { AlertTriangle, Check, Calendar, RefreshCw } from 'lucide-react';
import { format, addDays } from 'date-fns';

const severityColors: Record<string, string> = {
  error: 'border-l-red-500 bg-red-50',
  warning: 'border-l-yellow-500 bg-yellow-50',
  info: 'border-l-blue-500 bg-blue-50',
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [checkDate, setCheckDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);

  const checkAlerts = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/alerts/check/${checkDate}`);
      setAlerts(res.data.map((a: any, i: number) => ({ ...a, _key: `${checkDate}-${i}` })));
    } finally {
      setLoading(false);
    }
  };

  const checkWeek = async () => {
    setLoading(true);
    try {
      const days = Array.from({ length: 7 }, (_, i) => format(addDays(new Date(), i), 'yyyy-MM-dd'));
      const results = await Promise.all(days.map(d => api.get(`/alerts/check/${d}`).then(r => r.data.map((a: any, j: number) => ({ ...a, _key: `${d}-${j}`, checkDate: d }))).catch(() => [])));
      setAlerts(results.flat());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { checkAlerts(); }, []);

  const dismiss = (key: string) => {
    setAlerts(prev => prev.filter(a => a._key !== key));
  };

  const criticalCount = alerts.filter(a => a.severity === 'error').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;
  const infoCount = alerts.filter(a => a.severity === 'info').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Alertas Inteligentes</h1>
          <p className="text-gray-500">Verificação automática de rotinas e conteúdos</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
          <Calendar size={16} className="text-gray-400" />
          <input type="date" value={checkDate} onChange={e => setCheckDate(e.target.value)}
            className="text-sm border-0 focus:ring-0 p-0" />
        </div>
        <button onClick={checkAlerts} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-50">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Verificar Dia
        </button>
        <button onClick={checkWeek} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm disabled:opacity-50">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Verificar Semana
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-700">{criticalCount}</p>
          <p className="text-sm text-red-500">Críticos</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-yellow-700">{warningCount}</p>
          <p className="text-sm text-yellow-500">Avisos</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-700">{infoCount}</p>
          <p className="text-sm text-blue-500">Informações</p>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-16">
          <Check size={48} className="mx-auto text-green-400 mb-4" />
          <p className="text-lg font-medium text-gray-800">Tudo certo!</p>
          <p className="text-gray-500">Nenhum alerta encontrado para esta data.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div key={alert._key} className={`border-l-4 rounded-lg p-4 ${severityColors[alert.severity] || 'bg-gray-50 border-l-gray-300'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={18} className={
                    alert.severity === 'error' ? 'text-red-500 mt-0.5' :
                    alert.severity === 'warning' ? 'text-yellow-500 mt-0.5' :
                    'text-blue-500 mt-0.5'
                  } />
                  <div>
                    <p className="font-medium text-gray-800">{alert.type?.replace(/_/g, ' ')}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{alert.message}</p>
                    {alert.checkDate && (
                      <p className="text-xs text-gray-400 mt-1">📅 {format(new Date(alert.checkDate + 'T12:00:00'), 'dd/MM/yyyy')}</p>
                    )}
                  </div>
                </div>
                <button onClick={() => dismiss(alert._key)}
                  className="text-xs px-3 py-1.5 bg-white border rounded-lg hover:bg-gray-50 transition flex items-center gap-1 shrink-0">
                  <Check size={12} /> Resolver
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
