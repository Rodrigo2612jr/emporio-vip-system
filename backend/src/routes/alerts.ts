import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// Gerar alertas para uma data
router.get('/check/:date', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const date = new Date(req.params.date);
    date.setHours(0, 0, 0, 0);

    const routine = await prisma.dailyRoutine.findUnique({
      where: { date },
      include: { messages: true, campaign: true }
    });

    const alerts: Array<{ type: string; message: string; severity: string }> = [];

    if (!routine) {
      alerts.push({ type: 'rotina_incompleta', message: 'Nenhuma rotina criada para esta data', severity: 'error' });
      res.json(alerts);
      return;
    }

    // Verificar mensagens
    const messages = routine.messages;
    if (messages.length < 5) {
      alerts.push({ type: 'rotina_incompleta', message: `Apenas ${messages.length} mensagens (mínimo 5)`, severity: 'error' });
    }

    // Oferta sem CTA
    const offersWithoutCta = messages.filter(m => ['oferta', 'urgencia', 'fechamento'].includes(m.type) && !m.cta);
    offersWithoutCta.forEach(m => {
      alerts.push({ type: 'sem_cta', message: `Mensagem #${m.order} (${m.type}) sem CTA`, severity: 'warning' });
    });

    // Sem bastidor ou prova social
    const hasBastidor = messages.some(m => ['bastidor', 'prova_social'].includes(m.type));
    if (!hasBastidor) {
      alerts.push({ type: 'sem_bastidor', message: 'Dia sem bastidor ou prova social', severity: 'info' });
    }

    // Excesso de promoções seguidas
    let promoSequence = 0;
    for (const m of messages.sort((a, b) => a.order - b.order)) {
      if (['oferta', 'urgencia', 'reposicao'].includes(m.type)) {
        promoSequence++;
        if (promoSequence >= 3) {
          alerts.push({ type: 'excesso_promo', message: '3 ou mais mensagens promocionais em sequência', severity: 'warning' });
          break;
        }
      } else {
        promoSequence = 0;
      }
    }

    // Campanha sem meta
    if (routine.campaign && !routine.campaign.goal) {
      alerts.push({ type: 'sem_meta', message: `Campanha "${routine.campaign.name}" sem meta definida`, severity: 'warning' });
    }

    // Mensagens sem texto
    const emptyMessages = messages.filter(m => !m.text || m.text.trim() === '');
    if (emptyMessages.length > 0) {
      alerts.push({ type: 'rotina_incompleta', message: `${emptyMessages.length} mensagem(ns) sem texto`, severity: 'warning' });
    }

    // Mensagens sem horário
    const noTime = messages.filter(m => !m.scheduledTime);
    if (noTime.length > 0) {
      alerts.push({ type: 'rotina_incompleta', message: `${noTime.length} mensagem(ns) sem horário definido`, severity: 'info' });
    }

    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao verificar alertas' });
  }
});

// Listar alertas recentes
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { resolved } = req.query;
    const where: any = {};
    if (resolved !== undefined) where.resolved = resolved === 'true';

    const alerts = await prisma.alert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar alertas' });
  }
});

// Resolver alerta
router.put('/:id/resolve', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const alert = await prisma.alert.update({
      where: { id: req.params.id },
      data: { resolved: true }
    });
    res.json(alert);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao resolver alerta' });
  }
});

export default router;
