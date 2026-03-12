import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// Listar conteúdos
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { category, subtype, search, productId } = req.query;
    const where: any = {};
    if (category) where.category = category;
    if (subtype) where.subtype = subtype;
    if (productId) where.productId = productId;
    if (search) where.OR = [
      { title: { contains: String(search) } },
      { text: { contains: String(search) } },
      { tags: { contains: String(search) } }
    ];

    const items = await prisma.contentItem.findMany({
      where,
      include: { product: { select: { id: true, name: true } } },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar conteúdos' });
  }
});

// Buscar por ID
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const item = await prisma.contentItem.findUnique({
      where: { id: req.params.id },
      include: { product: true }
    });
    if (!item) { res.status(404).json({ error: 'Conteúdo não encontrado' }); return; }
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar conteúdo' });
  }
});

// Criar conteúdo
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, category, subtype, text, cta, productId, objective, mentalTrigger, format, tags, mediaUrl } = req.body;
    if (!title || !category || !text) {
      res.status(400).json({ error: 'Título, categoria e texto são obrigatórios' });
      return;
    }
    const item = await prisma.contentItem.create({
      data: { title, category, subtype, text, cta, productId, objective, mentalTrigger, format, tags: tags ? JSON.stringify(tags) : null, mediaUrl }
    });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar conteúdo' });
  }
});

// Atualizar conteúdo
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, category, subtype, text, cta, productId, objective, mentalTrigger, format, tags, mediaUrl } = req.body;
    const item = await prisma.contentItem.update({
      where: { id: req.params.id },
      data: { title, category, subtype, text, cta, productId, objective, mentalTrigger, format, tags: tags ? JSON.stringify(tags) : undefined, mediaUrl }
    });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar conteúdo' });
  }
});

// Registrar uso
router.post('/:id/use', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const item = await prisma.contentItem.update({
      where: { id: req.params.id },
      data: { usageCount: { increment: 1 } }
    });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao registrar uso' });
  }
});

// Deletar conteúdo
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.contentItem.delete({ where: { id: req.params.id } });
    res.json({ message: 'Conteúdo removido' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover conteúdo' });
  }
});

// Categorias de conteúdo
router.get('/meta/categories', async (_req: AuthRequest, res: Response): Promise<void> => {
  res.json([
    'energia_natural', 'intestino_saudavel', 'imunidade', 'relaxamento',
    'snacks_saudaveis', 'chocolates_especiais', 'chas_ervas', 'graos_cereais',
    'farinhas', 'sementes', 'castanhas_oleaginosas', 'mel_derivados',
    'suplementos', 'temperos', 'organicos', 'receitas', 'bastidores',
    'tutorial_compra', 'grupo_vip', 'ofertas', 'sazonalidades'
  ]);
});

export default router;
