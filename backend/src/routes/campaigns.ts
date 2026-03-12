import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// Listar campanhas
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, search } = req.query;
    const where: any = {};
    if (status) where.status = status;
    if (search) where.name = { contains: String(search) };

    const campaigns = await prisma.campaign.findMany({
      where,
      include: { anchorProduct: true, secondaryProducts: { include: { product: true } } },
      orderBy: { startDate: 'desc' }
    });
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar campanhas' });
  }
});

// Buscar campanha por ID
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: req.params.id },
      include: {
        anchorProduct: true,
        secondaryProducts: { include: { product: true } },
        linkedPieces: true,
        dailyRoutines: { orderBy: { date: 'asc' } },
        leads: true
      }
    });
    if (!campaign) { res.status(404).json({ error: 'Campanha não encontrada' }); return; }
    res.json(campaign);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar campanha' });
  }
});

// Criar campanha
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description, startDate, endDate, goal, objective, mainTrigger, anchorProductId, secondaryProductIds, status } = req.body;
    if (!name || !startDate || !endDate) {
      res.status(400).json({ error: 'Nome, data início e data fim são obrigatórios' });
      return;
    }
    const campaign = await prisma.campaign.create({
      data: {
        name, description,
        startDate: new Date(startDate), endDate: new Date(endDate),
        goal, objective, mainTrigger, anchorProductId,
        status: status || 'rascunho',
        secondaryProducts: secondaryProductIds?.length ? {
          create: secondaryProductIds.map((pid: string) => ({ productId: pid }))
        } : undefined
      },
      include: { anchorProduct: true, secondaryProducts: { include: { product: true } } }
    });
    res.status(201).json(campaign);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar campanha' });
  }
});

// Atualizar campanha
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description, startDate, endDate, goal, objective, mainTrigger, anchorProductId, status, secondaryProductIds } = req.body;
    if (secondaryProductIds) {
      await prisma.campaignProduct.deleteMany({ where: { campaignId: req.params.id } });
    }
    const campaign = await prisma.campaign.update({
      where: { id: req.params.id },
      data: {
        name, description,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        goal, objective, mainTrigger, anchorProductId, status,
        secondaryProducts: secondaryProductIds?.length ? {
          create: secondaryProductIds.map((pid: string) => ({ productId: pid }))
        } : undefined
      },
      include: { anchorProduct: true, secondaryProducts: { include: { product: true } } }
    });
    res.json(campaign);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar campanha' });
  }
});

// Deletar campanha
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.campaign.delete({ where: { id: req.params.id } });
    res.json({ message: 'Campanha removida' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover campanha' });
  }
});

export default router;
