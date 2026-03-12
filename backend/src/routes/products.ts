import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// Listar produtos
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { category, status, search } = req.query;
    const where: any = {};
    if (category) where.category = category;
    if (status) where.status = status;
    if (search) where.name = { contains: String(search) };

    const products = await prisma.product.findMany({ where, orderBy: { name: 'asc' } });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar produtos' });
  }
});

// Buscar produto por ID
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { mediaItems: true, contentItems: true }
    });
    if (!product) { res.status(404).json({ error: 'Produto não encontrado' }); return; }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar produto' });
  }
});

// Criar produto
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, category, shortDescription, benefits, applications, price, promoPrice, imageUrl, tags, status } = req.body;
    if (!name || !category) {
      res.status(400).json({ error: 'Nome e categoria são obrigatórios' });
      return;
    }
    const product = await prisma.product.create({
      data: { name, category, shortDescription, benefits, applications, price, promoPrice, imageUrl, tags: tags ? JSON.stringify(tags) : null, status }
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar produto' });
  }
});

// Atualizar produto
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, category, shortDescription, benefits, applications, price, promoPrice, imageUrl, tags, status } = req.body;
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { name, category, shortDescription, benefits, applications, price, promoPrice, imageUrl, tags: tags ? JSON.stringify(tags) : undefined, status }
    });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar produto' });
  }
});

// Deletar produto
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ message: 'Produto removido' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover produto' });
  }
});

// Categorias de produtos
router.get('/meta/categories', async (_req: AuthRequest, res: Response): Promise<void> => {
  res.json([
    'adocantes_naturais', 'castanhas', 'oleaginosas', 'frutas_secas', 'chips', 'snacks',
    'chocolates_especiais', 'trufados', 'chas', 'chimarrao', 'cosmeticos', 'ervas',
    'farinhas', 'frutas_especiais', 'granolas', 'cereais', 'graos', 'meles_derivados',
    'mercearia', 'organicos', 'suplementos', 'temperos'
  ]);
});

export default router;
