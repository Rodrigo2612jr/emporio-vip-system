import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'emporio-vip-secret-key-2026';

// Login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !await bcrypt.compare(password, user.password)) {
      res.status(401).json({ error: 'Email ou senha inválidos' });
      return;
    }
    if (!user.active) {
      res.status(403).json({ error: 'Usuário desativado' });
      return;
    }
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: 'Erro no login' });
  }
});

// Register (admin only)
router.post('/register', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.userRole !== 'admin') {
      res.status(403).json({ error: 'Apenas admin pode criar usuários' });
      return;
    }
    const { name, email, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, role: role || 'conteudo' },
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    });
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, email: true, role: true, avatar: true, createdAt: true }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

// Setup inicial - cria admin se não existir nenhum usuário
router.post('/setup', async (req: Request, res: Response): Promise<void> => {
  try {
    const count = await prisma.user.count();
    if (count > 0) {
      res.status(400).json({ error: 'Setup já realizado' });
      return;
    }
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, role: 'admin' }
    });
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: 'Erro no setup' });
  }
});

export default router;
