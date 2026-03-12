import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

import authRoutes from './routes/auth';
import campaignRoutes from './routes/campaigns';
import productRoutes from './routes/products';
import dailyRoutineRoutes from './routes/dailyRoutines';
import messageRoutes from './routes/messages';
import contentRoutes from './routes/content';
import mediaRoutes from './routes/media';
import leadRoutes from './routes/leads';
import alertRoutes from './routes/alerts';
import metricsRoutes from './routes/metrics';
import seasonalRoutes from './routes/seasonal';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/products', productRoutes);
app.use('/api/daily-routines', dailyRoutineRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/seasonal', seasonalRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});

export default app;
