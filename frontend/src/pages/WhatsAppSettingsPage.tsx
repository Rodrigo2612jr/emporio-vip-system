import { useEffect, useState } from 'react';
import api from '../lib/api';
import { Settings, Wifi, WifiOff, Save, TestTube, MessageSquare, ExternalLink } from 'lucide-react';

export default function WhatsAppSettingsPage() {
  const [form, setForm] = useState({
    whatsapp_api_url: '',
    whatsapp_api_key: '',
    whatsapp_instance: '',
    whatsapp_group_id: '',
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<null | { connected: boolean; error?: string }>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    api.get('/settings/whatsapp').then(res => {
      setForm(prev => ({ ...prev, ...res.data }));
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await api.put('/settings/whatsapp', form);
      setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
    } catch {
      setMessage({ type: 'error', text: 'Erro ao salvar configurações' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setConnectionStatus(null);
    setMessage(null);
    try {
      const res = await api.post('/settings/whatsapp/test');
      setConnectionStatus(res.data);
      if (res.data.connected) {
        setMessage({ type: 'success', text: 'Conexão estabelecida com sucesso!' });
      } else {
        setMessage({ type: 'error', text: res.data.error || 'Não foi possível conectar' });
      }
    } catch {
      setConnectionStatus({ connected: false, error: 'Erro ao testar conexão' });
      setMessage({ type: 'error', text: 'Erro ao testar conexão' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-green-100 p-2 rounded-lg">
          <MessageSquare className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">WhatsApp API</h1>
          <p className="text-sm text-gray-500">Configure a conexão com a API do WhatsApp para envio automático</p>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Status da Conexão */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {connectionStatus?.connected ? (
              <div className="bg-green-100 p-2 rounded-full">
                <Wifi className="w-5 h-5 text-green-600" />
              </div>
            ) : (
              <div className="bg-gray-100 p-2 rounded-full">
                <WifiOff className="w-5 h-5 text-gray-400" />
              </div>
            )}
            <div>
              <p className="font-medium text-gray-800">Status da Conexão</p>
              <p className="text-sm text-gray-500">
                {connectionStatus === null
                  ? 'Clique em "Testar Conexão" para verificar'
                  : connectionStatus.connected
                    ? 'Conectado e pronto para enviar'
                    : connectionStatus.error || 'Desconectado'}
              </p>
            </div>
          </div>
          <button
            onClick={handleTest}
            disabled={testing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            <TestTube className="w-4 h-4" />
            {testing ? 'Testando...' : 'Testar Conexão'}
          </button>
        </div>
      </div>

      {/* Configurações */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-gray-600" />
          <h2 className="font-semibold text-gray-800">Configurações da API</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL da API (Evolution API)</label>
            <input
              type="url"
              value={form.whatsapp_api_url}
              onChange={e => setForm(f => ({ ...f, whatsapp_api_url: e.target.value }))}
              placeholder="https://sua-evolution-api.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
            />
            <p className="mt-1 text-xs text-gray-400">Ex: https://evolution.suaempresa.com ou http://localhost:8080</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
            <input
              type="password"
              value={form.whatsapp_api_key}
              onChange={e => setForm(f => ({ ...f, whatsapp_api_key: e.target.value }))}
              placeholder="Sua chave de API"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Instância</label>
            <input
              type="text"
              value={form.whatsapp_instance}
              onChange={e => setForm(f => ({ ...f, whatsapp_instance: e.target.value }))}
              placeholder="nome-da-instancia"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
            />
            <p className="mt-1 text-xs text-gray-400">Nome da instância criada na Evolution API</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ID do Grupo</label>
            <input
              type="text"
              value={form.whatsapp_group_id}
              onChange={e => setForm(f => ({ ...f, whatsapp_group_id: e.target.value }))}
              placeholder="120363XXXXXXXXXX@g.us"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
            />
            <p className="mt-1 text-xs text-gray-400">ID do grupo WhatsApp VIP (formato: 120363...@g.us)</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <h3 className="font-semibold text-amber-800 mb-2">Como funciona o envio automático?</h3>
        <ul className="text-sm text-amber-700 space-y-2">
          <li>• Configure acima a conexão com sua instância da <strong>Evolution API</strong></li>
          <li>• No <strong>Calendário</strong>, crie rotinas diárias com mensagens e horários</li>
          <li>• Mude o status da rotina para <strong>"Agendado"</strong></li>
          <li>• Mude o status das mensagens para <strong>"Agendado"</strong></li>
          <li>• O sistema verifica a cada minuto e envia automaticamente no horário programado</li>
          <li>• Mensagens com destino <strong>"Grupo VIP"</strong>, <strong>"WhatsApp API"</strong> ou <strong>"Todos"</strong> serão enviadas</li>
        </ul>
        <div className="mt-3 pt-3 border-t border-amber-200">
          <a
            href="https://doc.evolution-api.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-amber-800 hover:text-amber-900 font-medium"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Documentação da Evolution API
          </a>
        </div>
      </div>
    </div>
  );
}
