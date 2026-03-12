import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// Listar datas sazonais
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const dates = await prisma.seasonalDate.findMany({ orderBy: { date: 'asc' } });
    res.json(dates);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar datas sazonais' });
  }
});

// Criar data sazonal
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, date, description, campaignTip } = req.body;
    const item = await prisma.seasonalDate.create({
      data: { name, date: new Date(date), description, campaignTip }
    });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar data sazonal' });
  }
});

// Deletar data sazonal
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.seasonalDate.delete({ where: { id: req.params.id } });
    res.json({ message: 'Data sazonal removida' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover data sazonal' });
  }
});

// Seed com datas sazonais padrão
router.post('/seed', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const dates = [
      { name: 'Dia do Consumidor', date: new Date('2026-03-15'), description: 'Semana do Consumidor', campaignTip: 'Descontos progressivos e kits especiais' },
      { name: 'Páscoa', date: new Date('2026-04-05'), description: 'Período de Páscoa', campaignTip: 'Chocolates especiais, trufados e kits de presente' },
      { name: 'Dia das Mães', date: new Date('2026-05-10'), description: 'Dia das Mães', campaignTip: 'Kits de chás, cosméticos e produtos de bem-estar' },
      { name: 'Dia dos Namorados', date: new Date('2026-06-12'), description: 'Dia dos Namorados', campaignTip: 'Kits para casal, chocolates, trufados' },
      { name: 'Dia dos Pais', date: new Date('2026-08-09'), description: 'Dia dos Pais', campaignTip: 'Chimarrão, castanhas, snacks especiais' },
      { name: 'Primavera', date: new Date('2026-09-22'), description: 'Início da Primavera', campaignTip: 'Chás florais, ervas, produtos de imunidade' },
      { name: 'Dia das Crianças', date: new Date('2026-10-12'), description: 'Dia das Crianças', campaignTip: 'Snacks naturais, chips, granolas' },
      { name: 'Black Friday', date: new Date('2026-11-27'), description: 'Black Friday', campaignTip: 'Maiores descontos do ano, kits especiais' },
      { name: 'Natal', date: new Date('2026-12-25'), description: 'Natal', campaignTip: 'Cestas de Natal, kits presentes, chocolates' }
    ];

    const created = await prisma.seasonalDate.createMany({ data: dates, skipDuplicates: true });
    res.json({ message: `${created.count} datas sazonais criadas` });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao popular datas sazonais' });
  }
});

export default router;
