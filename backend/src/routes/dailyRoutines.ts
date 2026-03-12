import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// Listar rotinas (com filtros de data)
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, campaignId, status } = req.query;
    const where: any = {};
    if (startDate && endDate) {
      where.date = { gte: new Date(String(startDate)), lte: new Date(String(endDate)) };
    } else if (startDate) {
      where.date = { gte: new Date(String(startDate)) };
    }
    if (campaignId) where.campaignId = campaignId;
    if (status) where.status = status;

    const routines = await prisma.dailyRoutine.findMany({
      where,
      include: {
        campaign: { select: { id: true, name: true } },
        focusProduct: { select: { id: true, name: true, category: true } },
        messages: { orderBy: { order: 'asc' } },
        createdByUser: { select: { id: true, name: true } }
      },
      orderBy: { date: 'asc' }
    });
    res.json(routines);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar rotinas' });
  }
});

// Buscar rotina por data
router.get('/by-date/:date', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const date = new Date(req.params.date);
    date.setHours(0, 0, 0, 0);
    const routine = await prisma.dailyRoutine.findUnique({
      where: { date },
      include: {
        campaign: true,
        focusProduct: true,
        messages: { orderBy: { order: 'asc' }, include: { product: true } },
        createdByUser: { select: { id: true, name: true } }
      }
    });
    if (!routine) { res.status(404).json({ error: 'Rotina não encontrada para esta data' }); return; }
    res.json(routine);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar rotina' });
  }
});

// Buscar rotina por ID
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const routine = await prisma.dailyRoutine.findUnique({
      where: { id: req.params.id },
      include: {
        campaign: true,
        focusProduct: true,
        messages: { orderBy: { order: 'asc' }, include: { product: true } },
        createdByUser: { select: { id: true, name: true } }
      }
    });
    if (!routine) { res.status(404).json({ error: 'Rotina não encontrada' }); return; }
    res.json(routine);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar rotina' });
  }
});

// Criar rotina diária com mensagens padrão
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { date, campaignId, focusProductId, objective, dailyGoal, messageCount, notes } = req.body;
    if (!date) { res.status(400).json({ error: 'Data é obrigatória' }); return; }

    const routineDate = new Date(date);
    routineDate.setHours(0, 0, 0, 0);

    const count = Math.min(7, Math.max(5, messageCount || 6));

    // Template padrão de 6 mensagens
    const defaultMessages = [
      { order: 1, type: 'enquete', scheduledTime: '08:30', text: '', cta: '' },
      { order: 2, type: 'conteudo', scheduledTime: '10:00', text: '', cta: '' },
      { order: 3, type: 'oferta', scheduledTime: '12:00', text: '', cta: '' },
      { order: 4, type: 'bastidor', scheduledTime: '14:30', text: '', cta: '' },
      { order: 5, type: 'oferta', scheduledTime: '17:00', text: '', cta: '' },
      { order: 6, type: 'fechamento', scheduledTime: '19:30', text: '', cta: '' },
      { order: 7, type: 'urgencia', scheduledTime: '21:00', text: '', cta: '' }
    ].slice(0, count);

    const routine = await prisma.dailyRoutine.create({
      data: {
        date: routineDate,
        campaignId, focusProductId, objective, dailyGoal,
        messageCount: count, notes,
        createdBy: req.userId,
        messages: { create: defaultMessages }
      },
      include: { campaign: true, focusProduct: true, messages: { orderBy: { order: 'asc' } } }
    });
    res.status(201).json(routine);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      res.status(400).json({ error: 'Já existe rotina para esta data' });
      return;
    }
    res.status(500).json({ error: 'Erro ao criar rotina' });
  }
});

// Atualizar rotina
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { campaignId, focusProductId, objective, dailyGoal, messageCount, notes, status } = req.body;
    const routine = await prisma.dailyRoutine.update({
      where: { id: req.params.id },
      data: {
        campaignId, focusProductId, objective, dailyGoal,
        messageCount: messageCount ? Math.min(7, Math.max(5, messageCount)) : undefined,
        notes, status
      },
      include: { campaign: true, focusProduct: true, messages: { orderBy: { order: 'asc' } } }
    });
    res.json(routine);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar rotina' });
  }
});

// Duplicar rotina para outra data
router.post('/:id/duplicate', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { targetDate } = req.body;
    if (!targetDate) { res.status(400).json({ error: 'Data destino é obrigatória' }); return; }

    const source = await prisma.dailyRoutine.findUnique({
      where: { id: req.params.id },
      include: { messages: { orderBy: { order: 'asc' } } }
    });
    if (!source) { res.status(404).json({ error: 'Rotina origem não encontrada' }); return; }

    const newDate = new Date(targetDate);
    newDate.setHours(0, 0, 0, 0);

    const routine = await prisma.dailyRoutine.create({
      data: {
        date: newDate,
        campaignId: source.campaignId,
        focusProductId: source.focusProductId,
        objective: source.objective,
        dailyGoal: source.dailyGoal,
        messageCount: source.messageCount,
        notes: source.notes,
        createdBy: req.userId,
        messages: {
          create: source.messages.map(m => ({
            order: m.order, type: m.type, text: m.text, cta: m.cta,
            mediaUrl: m.mediaUrl, scheduledTime: m.scheduledTime,
            destination: m.destination, productId: m.productId
          }))
        }
      },
      include: { campaign: true, focusProduct: true, messages: { orderBy: { order: 'asc' } } }
    });
    res.status(201).json(routine);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      res.status(400).json({ error: 'Já existe rotina para a data destino' });
      return;
    }
    res.status(500).json({ error: 'Erro ao duplicar rotina' });
  }
});

// Deletar rotina
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.dailyRoutine.delete({ where: { id: req.params.id } });
    res.json({ message: 'Rotina removida' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover rotina' });
  }
});

export default router;
