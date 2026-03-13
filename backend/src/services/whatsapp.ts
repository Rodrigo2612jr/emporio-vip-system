import prisma from '../lib/prisma';

interface WhatsAppConfig {
  apiUrl: string;
  apiKey: string;
  instanceName: string;
  groupId: string;
}

async function getConfig(): Promise<WhatsAppConfig | null> {
  const keys = ['whatsapp_api_url', 'whatsapp_api_key', 'whatsapp_instance', 'whatsapp_group_id'];
  const settings = await prisma.setting.findMany({ where: { key: { in: keys } } });

  const map = new Map(settings.map(s => [s.key, s.value]));
  const apiUrl = map.get('whatsapp_api_url');
  const apiKey = map.get('whatsapp_api_key');
  const instanceName = map.get('whatsapp_instance');
  const groupId = map.get('whatsapp_group_id');

  if (!apiUrl || !apiKey || !instanceName || !groupId) return null;
  return { apiUrl, apiKey, instanceName, groupId };
}

export async function sendTextMessage(text: string): Promise<{ success: boolean; error?: string }> {
  const config = await getConfig();
  if (!config) return { success: false, error: 'WhatsApp API não configurada' };

  try {
    const url = `${config.apiUrl}/message/sendText/${config.instanceName}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.apiKey,
      },
      body: JSON.stringify({
        number: config.groupId,
        text: text,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${body}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao enviar mensagem' };
  }
}

export async function sendMediaMessage(
  mediaUrl: string,
  caption?: string
): Promise<{ success: boolean; error?: string }> {
  const config = await getConfig();
  if (!config) return { success: false, error: 'WhatsApp API não configurada' };

  try {
    const url = `${config.apiUrl}/message/sendMedia/${config.instanceName}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.apiKey,
      },
      body: JSON.stringify({
        number: config.groupId,
        mediatype: 'image',
        media: mediaUrl,
        caption: caption || '',
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${body}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao enviar mídia' };
  }
}

export async function fetchGroups(): Promise<{ groups: Array<{ id: string; subject: string; size: number }>; error?: string }> {
  const config = await getConfig();
  if (!config) return { groups: [], error: 'WhatsApp API não configurada. Salve as configurações primeiro.' };

  try {
    const url = `${config.apiUrl}/group/fetchAllGroups/${config.instanceName}?getParticipants=false`;
    const response = await fetch(url, {
      headers: { 'apikey': config.apiKey },
    });

    if (!response.ok) {
      const body = await response.text();
      return { groups: [], error: `HTTP ${response.status}: ${body}` };
    }

    const data = await response.json();
    const groups = (Array.isArray(data) ? data : []).map((g: any) => ({
      id: g.id || g.jid || '',
      subject: g.subject || g.name || 'Sem nome',
      size: g.size || g.participants?.length || 0,
    }));
    return { groups };
  } catch (err: any) {
    return { groups: [], error: err.message || 'Erro ao buscar grupos' };
  }
}

export async function testConnection(): Promise<{ connected: boolean; error?: string }> {
  const config = await getConfig();
  if (!config) return { connected: false, error: 'WhatsApp API não configurada' };

  try {
    const url = `${config.apiUrl}/instance/connectionState/${config.instanceName}`;
    const response = await fetch(url, {
      headers: { 'apikey': config.apiKey },
    });

    if (!response.ok) {
      const body = await response.text();
      return { connected: false, error: `HTTP ${response.status}: ${body}` };
    }

    const data = await response.json();
    const state = data?.instance?.state || data?.state;
    return { connected: state === 'open' || state === 'connected', error: state !== 'open' && state !== 'connected' ? `Estado: ${state}` : undefined };
  } catch (err: any) {
    return { connected: false, error: err.message || 'Erro ao conectar' };
  }
}
