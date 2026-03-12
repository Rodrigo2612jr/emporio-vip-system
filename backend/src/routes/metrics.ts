import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// Dashboard principal
router.get('/dashboard', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [
      totalMessages, sentMessages, activeCampaigns,
      leadsThisMonth, openLeads, closedLeads, lostLeads,
      totalProducts, revenue, totalRoutines
    ] = await Promise.all([
      prisma.message.count(),
      prisma.message.count({ where: { status: 'enviado' } }),
      prisma.campaign.count({ where: { status: 'ativa' } }),
      prisma.lead.count({ where: { createdAt: { gte: startOfMonth, lte: endOfMonth } } }),
      prisma.lead.count({ where: { status: { in: ['novo', 'em_atendimento', 'aguardando_resposta', 'aguardando_pagamento'] } } }),
      prisma.lead.count({ where: { status: 'fechado', updatedAt: { gte: startOfMonth } } }),
      prisma.lead.count({ where: { status: 'perdido', updatedAt: { gte: startOfMonth } } }),
      prisma.product.count({ where: { status: 'ativo' } }),
      prisma.lead.aggregate({ where: { status: 'fechado', updatedAt: { gte: startOfMonth } }, _sum: { saleValue: true } }),
      prisma.dailyRoutine.count({ where: { date: { gte: startOfMonth, lte: endOfMonth } } })
    ]);

    const conversionRate = (closedLeads + lostLeads) > 0
      ? ((closedLeads / (closedLeads + lostLeads)) * 100).toFixed(1)
      : '0';

    res.json({
      totalMessages,
      sentMessages,
      activeCampaigns,
      leadsThisMonth,
      openLeads,
      closedLeads,
      totalProducts,
      revenueThisMonth: revenue._sum.saleValue || 0,
      conversionRate: parseFloat(conversionRate),
      routinesThisMonth: totalRoutines
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar métricas' });
  }
});

// Métricas por campanha
router.get('/campaigns', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const days = parseInt(String(req.query.days)) || 0;
    const dateFilter = days > 0 ? new Date(Date.now() - days * 86400000) : undefined;

    const campaigns = await prisma.campaign.findMany({
      where: { status: { in: ['ativa', 'finalizada'] } },
      include: {
        leads: { where: dateFilter ? { createdAt: { gte: dateFilter } } : undefined },
        dailyRoutines: {
          where: dateFilter ? { date: { gte: dateFilter } } : undefined,
          include: { messages: true }
        }
      }
    });

    const metrics = campaigns.map(c => {
      const totalLeads = c.leads.length;
      const closedLeads = c.leads.filter(l => l.status === 'fechado').length;
      const revenue = c.leads.filter(l => l.status === 'fechado').reduce((sum, l) => sum + (l.saleValue || 0), 0);
      const totalMessages = c.dailyRoutines.reduce((sum, r) => sum + r.messages.length, 0);
      const sentMessages = c.dailyRoutines.reduce((sum, r) => sum + r.messages.filter(m => m.status === 'enviado').length, 0);

      return {
        id: c.id,
        name: c.name,
        status: c.status,
        totalLeads,
        closedLeads,
        revenue,
        totalMessages,
        sentMessages,
        conversionRate: totalLeads > 0 ? ((closedLeads / totalLeads) * 100).toFixed(1) : '0'
      };
    });

    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar métricas de campanhas' });
  }
});

// Métricas por produto (top vendidos)
router.get('/products', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const days = parseInt(String(req.query.days)) || 0;
    const dateFilter = days > 0 ? new Date(Date.now() - days * 86400000) : undefined;

    const products = await prisma.product.findMany({
      include: { leads: { where: { status: 'fechado', ...(dateFilter ? { updatedAt: { gte: dateFilter } } : {}) } } }
    });

    const metrics = products
      .map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        salesCount: p.leads.length,
        revenue: p.leads.reduce((sum, l) => sum + (l.saleValue || 0), 0)
      }))
      .filter(p => p.salesCount > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 20);

    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar métricas de produtos' });
  }
});

// Sugestões inteligentes
router.get('/suggestions', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const suggestions: Array<{ type: string; message: string; priority: string; action?: string }> = [];

    // Campanhas com boa conversão para repetir
    const topCampaigns = await prisma.campaign.findMany({
      where: { status: 'finalizada' },
      include: { leads: true }
    });
    topCampaigns.forEach(c => {
      const closed = c.leads.filter(l => l.status === 'fechado').length;
      if (closed >= 3) {
        suggestions.push({
          type: 'repetir_campanha',
          message: `Campanha "${c.name}" teve ${closed} vendas. Considere repeti-la!`,
          priority: 'alta',
          action: `campaign:${c.id}`
        });
      }
    });

    // Produtos sem mídia
    const productsNoMedia = await prisma.product.findMany({
      where: { status: 'ativo', mediaItems: { none: {} } },
      take: 5
    });
    productsNoMedia.forEach(p => {
      suggestions.push({
        type: 'sem_midia',
        message: `Produto "${p.name}" não tem mídia associada`,
        priority: 'media'
      });
    });

    // Dias sem rotina na próxima semana
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const routinesNextWeek = await prisma.dailyRoutine.findMany({
      where: { date: { gte: today, lte: nextWeek } }
    });
    const routineDates = new Set(routinesNextWeek.map(r => r.date.toISOString().split('T')[0]));

    for (let d = new Date(today); d <= nextWeek; d.setDate(d.getDate() + 1)) {
      const dayStr = d.toISOString().split('T')[0];
      if (!routineDates.has(dayStr) && d.getDay() !== 0) { // ignorar domingo
        suggestions.push({
          type: 'sem_rotina',
          message: `Dia ${dayStr} ainda sem rotina planejada`,
          priority: 'alta'
        });
      }
    }

    // Leads parados
    const staleLeads = await prisma.lead.findMany({
      where: {
        status: { in: ['em_atendimento', 'aguardando_resposta'] },
        updatedAt: { lt: new Date(Date.now() - 48 * 60 * 60 * 1000) } // 48h
      }
    });
    if (staleLeads.length > 0) {
      suggestions.push({
        type: 'leads_parados',
        message: `${staleLeads.length} lead(s) sem atualização há mais de 48h`,
        priority: 'alta'
      });
    }

    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao gerar sugestões' });
  }
});

export default router;
