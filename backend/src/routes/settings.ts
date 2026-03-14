import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { testConnection, fetchGroups, sendTextMessage } from '../services/whatsapp';
import * as baileys from '../services/baileys';

const router = Router();
router.use(authMiddleware);

// Buscar configurações do WhatsApp
router.get('/whatsapp', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const groupSetting = await prisma.setting.findUnique({ where: { key: 'whatsapp_group_id' } });
    res.json({
      whatsapp_group_id: groupSetting?.value || '',
      connection_state: baileys.getConnectionState(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
});

// Salvar grupo do WhatsApp
router.put('/whatsapp', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { whatsapp_group_id } = req.body;
    if (whatsapp_group_id !== undefined) {
      await prisma.setting.upsert({
        where: { key: 'whatsapp_group_id' },
        update: { value: whatsapp_group_id },
        create: { key: 'whatsapp_group_id', value: whatsapp_group_id },
      });
    }
    res.json({ message: 'Configurações salvas com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar configurações' });
  }
});

// Obter QR Code para conectar WhatsApp
router.get('/whatsapp/qr', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const state = baileys.getConnectionState();
    if (state === 'open') {
      res.json({ connected: true, qr: null });
      return;
    }
    // Inicia a conexão se não estiver conectando
    if (state === 'close') {
      baileys.startBaileys();
    }
    // Aguarda um pouco para o QR ser gerado
    await new Promise(r => setTimeout(r, 2000));
    const qr = baileys.getQRCode();
    res.json({ connected: false, qr });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter QR Code' });
  }
});

// Desconectar WhatsApp
router.post('/whatsapp/disconnect', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    await baileys.disconnectBaileys();
    res.json({ message: 'Desconectado' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao desconectar' });
  }
});

// Testar conexão com WhatsApp
router.post('/whatsapp/test', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({ connected: false, error: 'Erro ao testar conexão' });
  }
});

// Listar grupos do WhatsApp
router.get('/whatsapp/groups', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await fetchGroups();
    res.json(result);
  } catch (error) {
    res.status(500).json({ groups: [], error: 'Erro ao buscar grupos' });
  }
});

// Enviar mensagem de teste
router.post('/whatsapp/send-test', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await sendTextMessage(req.body.text || '✅ Teste do Empório VIP System - Conexão funcionando!');
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Erro ao enviar mensagem de teste' });
  }
});

export default router;
