import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';

let sock: ReturnType<typeof makeWASocket> | null = null;
let connectionState: 'close' | 'connecting' | 'open' = 'close';
let qrCodeDataUrl: string | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let manualDisconnect = false;

const AUTH_DIR = path.join(process.cwd(), 'data', 'whatsapp_auth');

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
  manualDisconnect = false;

  try {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
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
        if (statusCode !== DisconnectReason.loggedOut && !manualDisconnect) {
          console.log('[WhatsApp] Desconectado, reconectando em 5s...');
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(() => startBaileys(), 5000);
        } else {
          console.log('[WhatsApp] Deslogado pelo usuário.');
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
  manualDisconnect = true;
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
  // Limpa arquivos de auth para desconectar de verdade
  try {
    if (fs.existsSync(AUTH_DIR)) {
      const files = fs.readdirSync(AUTH_DIR);
      for (const file of files) {
        fs.unlinkSync(path.join(AUTH_DIR, file));
      }
    }
  } catch (err) {
    console.error('[WhatsApp] Erro ao limpar auth:', err);
  }
}

// Auto-conecta no boot se já tiver sessão salva
export async function autoStartBaileys() {
  try {
    if (!fs.existsSync(AUTH_DIR)) return;
    const files = fs.readdirSync(AUTH_DIR);
    if (files.length > 0) {
      console.log('[WhatsApp] Sessão anterior encontrada, reconectando automaticamente...');
      await startBaileys();
    } else {
      console.log('[WhatsApp] Nenhuma sessão salva. Aguardando conexão manual.');
    }
  } catch (err) {
    console.error('[WhatsApp] Erro no auto-start:', err);
  }
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

  // Timeout de 15s para evitar travamento
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Timeout ao buscar grupos (15s)')), 15000)
  );

  let rawGroups: any;
  try {
    rawGroups = await Promise.race([
      sock.groupFetchAllParticipating(),
      timeoutPromise,
    ]);
  } catch (err: any) {
    console.error('[WhatsApp] Erro em groupFetchAllParticipating:', err?.message || err);
    throw new Error(err?.message || 'Erro ao buscar grupos do WhatsApp');
  }

  if (!rawGroups || typeof rawGroups !== 'object') return [];

  try {
    return Object.values(rawGroups)
      .filter((g: any) => g && g.id)
      .map((g: any) => ({
        id: String(g.id ?? ''),
        subject: String(g.subject ?? g.name ?? 'Sem nome'),
        size: Number(g.participants?.length ?? g.size ?? 0),
      }));
  } catch (err: any) {
    console.error('[WhatsApp] Erro ao processar dados dos grupos:', err?.message || err);
    return [];
  }
}
