import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// Listar leads
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, campaignId, assignedTo, search } = req.query;
    const where: any = {};
    if (status) where.status = status;
    if (campaignId) where.campaignId = campaignId;
    if (assignedTo) where.assignedTo = assignedTo;
    if (search) where.OR = [
      { name: { contains: String(search) } },
      { phone: { contains: String(search) } }
    ];

    const leads = await prisma.lead.findMany({
      where,
      include: {
        campaign: { select: { id: true, name: true } },
        product: { select: { id: true, name: true } },
        assignedUser: { select: { id: true, name: true } },
        history: { orderBy: { createdAt: 'desc' }, take: 5 }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar leads' });
  }
});

// Buscar lead por ID
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: req.params.id },
      include: {
        campaign: true,
        product: true,
        assignedUser: { select: { id: true, name: true } },
        history: { orderBy: { createdAt: 'desc' } }
      }
    });
    if (!lead) { res.status(404).json({ error: 'Lead não encontrado' }); return; }
    res.json(lead);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar lead' });
  }
});

// Criar lead
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, phone, campaignId, productId, sourceMessage, notes, salePotential } = req.body;
    if (!name) { res.status(400).json({ error: 'Nome é obrigatório' }); return; }

    const lead = await prisma.lead.create({
      data: {
        name, phone, campaignId, productId, sourceMessage, notes, salePotential,
        assignedTo: req.userId,
        history: {
          create: { action: 'Lead criado', details: sourceMessage ? `Mensagem: ${sourceMessage}` : undefined }
        }
      },
      include: { campaign: true, product: true, history: true }
    });
    res.status(201).json(lead);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar lead' });
  }
});

// Atualizar lead
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, phone, campaignId, productId, notes, assignedTo, status, salePotential, saleValue } = req.body;
    const current = await prisma.lead.findUnique({ where: { id: req.params.id } });
    if (!current) { res.status(404).json({ error: 'Lead não encontrado' }); return; }

    // Registrar mudança de status no histórico
    if (status && status !== current.status) {
      await prisma.leadHistory.create({
        data: { leadId: req.params.id, action: `Status: ${current.status} → ${status}` }
      });
    }

    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data: { name, phone, campaignId, productId, notes, assignedTo, status, salePotential, saleValue },
      include: { campaign: true, product: true, assignedUser: { select: { id: true, name: true } }, history: { orderBy: { createdAt: 'desc' } } }
    });
    res.json(lead);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar lead' });
  }
});

// Adicionar nota ao histórico
router.post('/:id/history', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { action, details } = req.body;
    const entry = await prisma.leadHistory.create({
      data: { leadId: req.params.id, action, details }
    });
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao adicionar histórico' });
  }
});

// Deletar lead
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.lead.delete({ where: { id: req.params.id } });
    res.json({ message: 'Lead removido' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover lead' });
  }
});

// Pipeline summary
router.get('/meta/pipeline', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const statuses = ['novo', 'em_atendimento', 'aguardando_resposta', 'aguardando_pagamento', 'fechado', 'perdido'];
    const pipeline = await Promise.all(
      statuses.map(async (status) => ({
        status,
        count: await prisma.lead.count({ where: { status } }),
        totalValue: (await prisma.lead.aggregate({ where: { status }, _sum: { saleValue: true } }))._sum.saleValue || 0
      }))
    );
    res.json(pipeline);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar pipeline' });
  }
});

export default router;
