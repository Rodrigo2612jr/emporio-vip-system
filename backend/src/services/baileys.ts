import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import path from 'path';

let sock: ReturnType<typeof makeWASocket> | null = null;
let connectionState: 'close' | 'connecting' | 'open' = 'close';
let qrCodeDataUrl: string | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

export function getConnectionState() {
  return connectionState;
}

export function getQRCode() {
  return qrCodeDataUrl;
}

export function getSocket() {
  return sock;
}

export async function startBaileys() {
  if (connectionState === 'open' || connectionState === 'connecting') return;
  connectionState = 'connecting';

  try {
    const authDir = path.join(process.cwd(), 'data', 'whatsapp_auth');
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: true,
      defaultQueryTimeoutMs: 60000,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          qrCodeDataUrl = await QRCode.toDataURL(qr);
          console.log('[WhatsApp] QR Code gerado - acesse a página WhatsApp API para escanear');
        } catch (err) {
          console.error('[WhatsApp] Erro ao gerar QR:', err);
        }
      }

      if (connection === 'close') {
        connectionState = 'close';
        qrCodeDataUrl = null;
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        if (statusCode !== DisconnectReason.loggedOut) {
          console.log('[WhatsApp] Desconectado, reconectando em 5s...');
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(() => startBaileys(), 5000);
        } else {
          console.log('[WhatsApp] Deslogado. Exclua data/whatsapp_auth e reconecte.');
          sock = null;
        }
      } else if (connection === 'open') {
        connectionState = 'open';
        qrCodeDataUrl = null;
        console.log('[WhatsApp] ✅ Conectado com sucesso!');
      }
    });
  } catch (err) {
    console.error('[WhatsApp] Erro ao iniciar:', err);
    connectionState = 'close';
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => startBaileys(), 10000);
  }
}

export async function disconnectBaileys() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (sock) {
    await sock.logout().catch(() => {});
    sock = null;
  }
  connectionState = 'close';
  qrCodeDataUrl = null;
}

export async function sendText(jid: string, text: string): Promise<void> {
  if (!sock || connectionState !== 'open') throw new Error('WhatsApp não conectado');
  await sock.sendMessage(jid, { text });
}

export async function sendImage(jid: string, imageUrl: string, caption?: string): Promise<void> {
  if (!sock || connectionState !== 'open') throw new Error('WhatsApp não conectado');
  await sock.sendMessage(jid, { image: { url: imageUrl }, caption: caption || '' });
}

export async function getGroups(): Promise<Array<{ id: string; subject: string; size: number }>> {
  if (!sock || connectionState !== 'open') throw new Error('WhatsApp não conectado');
  const groups = await sock.groupFetchAllParticipating();
  if (!groups || typeof groups !== 'object') return [];
  return Object.values(groups)
    .filter((g: any) => g && g.id)
    .map((g: any) => ({
      id: String(g.id || ''),
      subject: String(g.subject || g.name || 'Sem nome'),
      size: Number(g.participants?.length || g.size || 0),
    }));
}
