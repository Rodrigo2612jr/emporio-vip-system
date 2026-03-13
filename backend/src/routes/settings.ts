import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { testConnection } from '../services/whatsapp';

const router = Router();
router.use(authMiddleware);

const WHATSAPP_KEYS = ['whatsapp_api_url', 'whatsapp_api_key', 'whatsapp_instance', 'whatsapp_group_id'];

// Buscar configurações do WhatsApp
router.get('/whatsapp', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const settings = await prisma.setting.findMany({
      where: { key: { in: WHATSAPP_KEYS } },
    });

    const config: Record<string, string> = {};
    for (const s of settings) {
      // Mask the API key for security
      if (s.key === 'whatsapp_api_key' && s.value) {
        config[s.key] = s.value.substring(0, 8) + '••••••••';
      } else {
        config[s.key] = s.value;
      }
    }

    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
});

// Salvar configurações do WhatsApp
router.put('/whatsapp', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { whatsapp_api_url, whatsapp_api_key, whatsapp_instance, whatsapp_group_id } = req.body;

    const entries: { key: string; value: string }[] = [];
    if (whatsapp_api_url !== undefined) entries.push({ key: 'whatsapp_api_url', value: whatsapp_api_url });
    if (whatsapp_api_key !== undefined && !whatsapp_api_key.includes('••••')) {
      entries.push({ key: 'whatsapp_api_key', value: whatsapp_api_key });
    }
    if (whatsapp_instance !== undefined) entries.push({ key: 'whatsapp_instance', value: whatsapp_instance });
    if (whatsapp_group_id !== undefined) entries.push({ key: 'whatsapp_group_id', value: whatsapp_group_id });

    for (const entry of entries) {
      await prisma.setting.upsert({
        where: { key: entry.key },
        update: { value: entry.value },
        create: { key: entry.key, value: entry.value },
      });
    }

    res.json({ message: 'Configurações salvas com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar configurações' });
  }
});

// Testar conexão com WhatsApp API
router.post('/whatsapp/test', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({ connected: false, error: 'Erro ao testar conexão' });
  }
});

export default router;
