import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// Configurar multer para upload
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm', 'video/quicktime'
];

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido'));
    }
  }
});

// Listar mídias
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { category, productId, campaignId, search } = req.query;
    const where: any = {};
    if (category) where.category = category;
    if (productId) where.productId = productId;
    if (campaignId) where.campaignId = campaignId;
    if (search) where.OR = [
      { originalName: { contains: String(search) } },
      { tags: { contains: String(search) } }
    ];

    const items = await prisma.mediaItem.findMany({
      where,
      include: {
        product: { select: { id: true, name: true } },
        campaign: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar mídias' });
  }
});

// Upload de mídia
router.post('/', upload.single('file'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) { res.status(400).json({ error: 'Arquivo é obrigatório' }); return; }

    const { category, productId, campaignId, tags } = req.body;
    const item = await prisma.mediaItem.create({
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: `/uploads/${req.file.filename}`,
        category: category || 'geral',
        productId: productId || null,
        campaignId: campaignId || null,
        tags: tags || null
      }
    });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao fazer upload' });
  }
});

// Atualizar mídia
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { category, productId, campaignId, tags } = req.body;
    const item = await prisma.mediaItem.update({
      where: { id: req.params.id },
      data: { category, productId, campaignId, tags }
    });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar mídia' });
  }
});

// Deletar mídia
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.mediaItem.delete({ where: { id: req.params.id } });
    res.json({ message: 'Mídia removida' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover mídia' });
  }
});

export default router;
