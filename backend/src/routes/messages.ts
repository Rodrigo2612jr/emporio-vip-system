import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// Atualizar mensagem
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type, text, cta, mediaUrl, scheduledTime, destination, status, productId, order } = req.body;
    // Validar: oferta sem CTA
    if (type === 'oferta' && !cta && !req.body.skipValidation) {
      // Gera alerta mas permite salvar
      await prisma.alert.create({
        data: {
          type: 'sem_cta',
          message: 'Mensagem de oferta sem CTA definido',
          severity: 'warning',
          relatedId: req.params.id,
          relatedType: 'message'
        }
      });
    }
    const message = await prisma.message.update({
      where: { id: req.params.id },
      data: { type, text, cta, mediaUrl, scheduledTime, destination, status, productId, order },
      include: { product: true }
    });
    res.json(message);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar mensagem' });
  }
});

// Criar mensagem adicional em rotina
router.post('/routine/:routineId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const routine = await prisma.dailyRoutine.findUnique({ where: { id: req.params.routineId } });
    if (!routine) { res.status(404).json({ error: 'Rotina não encontrada' }); return; }

    const messageCount = await prisma.message.count({ where: { dailyRoutineId: routine.id } });
    if (messageCount >= 7) {
      res.status(400).json({ error: 'Máximo de 7 mensagens por dia' });
      return;
    }

    const { type, text, cta, mediaUrl, scheduledTime, destination, productId } = req.body;
    const message = await prisma.message.create({
      data: {
        dailyRoutineId: routine.id,
        order: messageCount + 1,
        type: type || 'conteudo',
        text, cta, mediaUrl, scheduledTime,
        destination: destination || 'grupo_vip',
        productId
      }
    });

    await prisma.dailyRoutine.update({
      where: { id: routine.id },
      data: { messageCount: messageCount + 1 }
    });

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar mensagem' });
  }
});

// Deletar mensagem
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const message = await prisma.message.findUnique({ where: { id: req.params.id } });
    if (!message) { res.status(404).json({ error: 'Mensagem não encontrada' }); return; }

    await prisma.message.delete({ where: { id: req.params.id } });

    // Reordenar mensagens restantes
    const remaining = await prisma.message.findMany({
      where: { dailyRoutineId: message.dailyRoutineId },
      orderBy: { order: 'asc' }
    });
    for (let i = 0; i < remaining.length; i++) {
      await prisma.message.update({ where: { id: remaining[i].id }, data: { order: i + 1 } });
    }

    const count = await prisma.message.count({ where: { dailyRoutineId: message.dailyRoutineId } });
    if (count >= 5) {
      await prisma.dailyRoutine.update({
        where: { id: message.dailyRoutineId },
        data: { messageCount: count }
      });
    }

    res.json({ message: 'Mensagem removida' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover mensagem' });
  }
});

// Marcar como enviada
router.post('/:id/send', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const message = await prisma.message.update({
      where: { id: req.params.id },
      data: { status: 'enviado', sentAt: new Date() }
    });
    res.json(message);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao marcar mensagem como enviada' });
  }
});

// Tipos de mensagem
router.get('/meta/types', async (_req: AuthRequest, res: Response): Promise<void> => {
  res.json([
    { value: 'enquete', label: 'Enquete' },
    { value: 'pergunta', label: 'Pergunta' },
    { value: 'conteudo', label: 'Conteúdo / Educação' },
    { value: 'bastidor', label: 'Bastidor' },
    { value: 'prova_social', label: 'Prova Social' },
    { value: 'receita', label: 'Receita' },
    { value: 'tutorial', label: 'Tutorial' },
    { value: 'novidade', label: 'Novidade' },
    { value: 'reposicao', label: 'Reposição' },
    { value: 'oferta', label: 'Oferta' },
    { value: 'urgencia', label: 'Urgência' },
    { value: 'fechamento', label: 'Fechamento' },
    { value: 'institucional', label: 'Institucional' },
    { value: 'chamada_site', label: 'Chamada para Site' },
    { value: 'chamada_loja', label: 'Chamada para Loja Física' }
  ]);
});

export default router;
