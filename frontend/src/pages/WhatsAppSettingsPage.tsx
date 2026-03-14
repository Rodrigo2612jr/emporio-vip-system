import { useEffect, useState, useCallback } from 'react';
import api from '../lib/api';
import { Wifi, WifiOff, Save, MessageSquare, Users, Send, RefreshCw, QrCode, Unplug } from 'lucide-react';

export default function WhatsAppSettingsPage() {
  const [groupId, setGroupId] = useState('');
  const [connectionState, setConnectionState] = useState('close');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingQR, setLoadingQR] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [groups, setGroups] = useState<Array<{ id: string; subject: string; size: number }>>([]);
  const [showGroups, setShowGroups] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      const res = await api.get('/settings/whatsapp');
      setGroupId(res.data.whatsapp_group_id || '');
      setConnectionState(res.data.connection_state || 'close');
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  // Poll para atualizar status enquanto conectando
  useEffect(() => {
    if (connectionState !== 'connecting' && !qrCode) return;
    const interval = setInterval(async () => {
      try {
        const res = await api.post('/settings/whatsapp/test');
        if (res.data.connected) {
          setConnectionState('open');
          setQrCode(null);
          setMessage({ type: 'success', text: 'WhatsApp conectado com sucesso!' });
          clearInterval(interval);
        }
      } catch { /* ignore */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [connectionState, qrCode]);

  const handleConnect = async () => {
    setLoadingQR(true);
    setMessage(null);
    try {
      const res = await api.get('/settings/whatsapp/qr');
      if (res.data.connected) {
        setConnectionState('open');
        setQrCode(null);
        setMessage({ type: 'success', text: 'Já está conectado!' });
      } else if (res.data.qr) {
        setQrCode(res.data.qr);
        setConnectionState('connecting');
        setMessage({ type: 'success', text: 'QR Code gerado! Escaneie com seu WhatsApp.' });
      } else {
        setMessage({ type: 'error', text: 'QR Code ainda não disponível. Tente novamente em alguns segundos.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro ao gerar QR Code' });
    } finally {
      setLoadingQR(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await api.post('/settings/whatsapp/disconnect');
      setConnectionState('close');
      setQrCode(null);
      setMessage({ type: 'success', text: 'WhatsApp desconectado.' });
    } catch {
      setMessage({ type: 'error', text: 'Erro ao desconectar' });
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await api.put('/settings/whatsapp', { whatsapp_group_id: groupId });
      setMessage({ type: 'success', text: 'Grupo salvo com sucesso!' });
    } catch {
      setMessage({ type: 'error', text: 'Erro ao salvar' });
    } finally {
      setSaving(false);
    }
  };

  const handleFetchGroups = async () => {
    setLoadingGroups(true);
    setMessage(null);
    try {
      const res = await api.get('/settings/whatsapp/groups');
      if (res.data.error) {
        setMessage({ type: 'error', text: res.data.error });
      } else {
        setGroups(res.data.groups || []);
        setShowGroups(true);
        if ((res.data.groups || []).length === 0) {
          setMessage({ type: 'error', text: 'Nenhum grupo encontrado.' });
        }
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro ao buscar grupos' });
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleSendTest = async () => {
    setSendingTest(true);
    setMessage(null);
    try {
      const res = await api.post('/settings/whatsapp/send-test');
      if (res.data.success) {
        setMessage({ type: 'success', text: 'Mensagem de teste enviada! Verifique o grupo.' });
      } else {
        setMessage({ type: 'error', text: res.data.error || 'Erro ao enviar' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erro ao enviar mensagem de teste' });
    } finally {
      setSendingTest(false);
    }
  };

  const isConnected = connectionState === 'open';

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-green-100 p-2 rounded-lg">
          <MessageSquare className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">WhatsApp</h1>
          <p className="text-sm text-gray-500">Conecte seu WhatsApp para envio automático de mensagens</p>
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Conexão */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {isConnected ? (
              <div className="bg-green-100 p-2 rounded-full">
                <Wifi className="w-5 h-5 text-green-600" />
              </div>
            ) : (
              <div className="bg-gray-100 p-2 rounded-full">
                <WifiOff className="w-5 h-5 text-gray-400" />
              </div>
            )}
            <div>
              <p className="font-medium text-gray-800">
                {isConnected ? 'WhatsApp Conectado' : connectionState === 'connecting' ? 'Aguardando escaneamento...' : 'WhatsApp Desconectado'}
              </p>
              <p className="text-sm text-gray-500">
                {isConnected ? 'Pronto para enviar mensagens' : 'Clique em "Conectar" para gerar o QR Code'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {!isConnected && (
              <button
                onClick={handleConnect}
                disabled={loadingQR}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
              >
                <QrCode className="w-4 h-4" />
                {loadingQR ? 'Gerando...' : 'Conectar'}
              </button>
            )}
            {isConnected && (
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
              >
                <Unplug className="w-4 h-4" />
                {disconnecting ? 'Desconectando...' : 'Desconectar'}
              </button>
            )}
          </div>
        </div>

        {/* QR Code */}
        {qrCode && !isConnected && (
          <div className="border-t pt-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-3">Escaneie o QR Code com seu WhatsApp:</p>
              <p className="text-xs text-gray-400 mb-3">WhatsApp &gt; 3 pontinhos &gt; Aparelhos conectados &gt; Conectar aparelho</p>
              <img src={qrCode} alt="QR Code WhatsApp" className="mx-auto w-64 h-64 rounded-lg border" />
              <button
                onClick={handleConnect}
                disabled={loadingQR}
                className="mt-3 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mx-auto"
              >
                <RefreshCw className={`w-3 h-3 ${loadingQR ? 'animate-spin' : ''}`} />
                Atualizar QR Code
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Grupo de Destino */}
      {isConnected && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Grupo de Destino</h2>

          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={groupId}
              onChange={e => setGroupId(e.target.value)}
              placeholder="Selecione um grupo abaixo"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
              readOnly
            />
            <button
              onClick={handleFetchGroups}
              disabled={loadingGroups}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm whitespace-nowrap"
            >
              {loadingGroups ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
              {loadingGroups ? 'Buscando...' : 'Buscar Grupos'}
            </button>
          </div>

          {showGroups && groups.length > 0 && (
            <div className="mb-4 border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
              {groups.map(g => (
                <button
                  key={g.id}
                  onClick={() => { setGroupId(g.id); setShowGroups(false); setMessage({ type: 'success', text: `Grupo "${g.subject}" selecionado!` }); }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-green-50 border-b border-gray-100 last:border-0 flex justify-between items-center ${groupId === g.id ? 'bg-green-50 text-green-700' : 'text-gray-700'}`}
                >
                  <span className="font-medium">{g.subject}</span>
                  <span className="text-xs text-gray-400">{g.size} membros</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !groupId}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar Grupo'}
            </button>
            <button
              onClick={handleSendTest}
              disabled={sendingTest || !groupId}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              <Send className="w-4 h-4" />
              {sendingTest ? 'Enviando...' : 'Enviar Teste'}
            </button>
          </div>
        </div>
      )}

      {/* Instruções */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <h3 className="font-semibold text-amber-800 mb-2">Como funciona?</h3>
        <ul className="text-sm text-amber-700 space-y-1">
          <li><strong>1.</strong> Clique <strong>"Conectar"</strong> — um QR Code vai aparecer</li>
          <li><strong>2.</strong> Abra o WhatsApp no celular &gt; <strong>3 pontinhos</strong> &gt; <strong>Aparelhos conectados</strong> &gt; <strong>Conectar</strong></li>
          <li><strong>3.</strong> Escaneie o QR Code — o status muda para "Conectado"</li>
          <li><strong>4.</strong> Clique <strong>"Buscar Grupos"</strong> e selecione o grupo VIP</li>
          <li><strong>5.</strong> Clique <strong>"Salvar"</strong> e depois <strong>"Enviar Teste"</strong> para confirmar</li>
        </ul>
        <p className="text-xs text-amber-600 mt-3">
          A conexão permanece ativa 24h no servidor. Se desconectar, basta escanear novamente.
        </p>
      </div>
    </div>
  );
}
