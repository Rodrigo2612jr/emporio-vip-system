import prisma from '../lib/prisma';
import * as baileys from './baileys';

async function getGroupId(): Promise<string | null> {
  const setting = await prisma.setting.findUnique({ where: { key: 'whatsapp_group_id' } });
  return setting?.value || null;
}

export async function sendTextMessage(text: string): Promise<{ success: boolean; error?: string }> {
  const groupId = await getGroupId();
  if (!groupId) return { success: false, error: 'Grupo do WhatsApp não configurado' };

  if (baileys.getConnectionState() !== 'open') {
    return { success: false, error: 'WhatsApp não conectado. Escaneie o QR Code na página de configurações.' };
  }

  try {
    await baileys.sendText(groupId, text);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao enviar mensagem' };
  }
}

export async function sendMediaMessage(
  mediaUrl: string,
  caption?: string
): Promise<{ success: boolean; error?: string }> {
  const groupId = await getGroupId();
  if (!groupId) return { success: false, error: 'Grupo do WhatsApp não configurado' };

  if (baileys.getConnectionState() !== 'open') {
    return { success: false, error: 'WhatsApp não conectado' };
  }

  try {
    await baileys.sendImage(groupId, mediaUrl, caption);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao enviar mídia' };
  }
}

export async function fetchGroups(): Promise<{ groups: Array<{ id: string; subject: string; size: number }>; error?: string }> {
  if (baileys.getConnectionState() !== 'open') {
    return { groups: [], error: 'WhatsApp não conectado. Escaneie o QR Code primeiro.' };
  }

  try {
    const groups = await baileys.getGroups();
    return { groups };
  } catch (err: any) {
    return { groups: [], error: err.message || 'Erro ao buscar grupos' };
  }
}

export async function testConnection(): Promise<{ connected: boolean; error?: string }> {
  const state = baileys.getConnectionState();
  return {
    connected: state === 'open',
    error: state !== 'open' ? `Estado: ${state}` : undefined,
  };
}
