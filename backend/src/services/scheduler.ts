import cron from 'node-cron';
import prisma from '../lib/prisma';
import { sendTextMessage, sendMediaMessage } from './whatsapp';

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

async function checkAndSendMessages() {
  const now = new Date();
  const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  // Find today's date range (start of day to end of day)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  try {
    // Find today's routines
    const routines = await prisma.dailyRoutine.findMany({
      where: {
        date: { gte: todayStart, lte: todayEnd },
        status: { in: ['agendado', 'aprovado'] },
      },
      include: { messages: true },
    });

    for (const routine of routines) {
      for (const message of routine.messages) {
        // Only send messages that are scheduled for right now and haven't been sent
        if (
          message.scheduledTime === currentTime &&
          message.status === 'agendado' &&
          (message.destination === 'grupo_vip' || message.destination === 'whatsapp_api' || message.destination === 'todos')
        ) {
          console.log(`📤 Enviando mensagem ${message.id} agendada para ${currentTime}...`);

          let result;
          if (message.mediaUrl) {
            result = await sendMediaMessage(message.mediaUrl, message.text || undefined);
          } else if (message.text) {
            // Build full message text with CTA if present
            const fullText = message.cta ? `${message.text}\n\n${message.cta}` : message.text;
            result = await sendTextMessage(fullText);
          } else {
            console.log(`⚠️ Mensagem ${message.id} sem conteúdo para enviar`);
            continue;
          }

          if (result.success) {
            await prisma.message.update({
              where: { id: message.id },
              data: { status: 'enviado', sentAt: new Date() },
            });
            console.log(`✅ Mensagem ${message.id} enviada com sucesso`);
          } else {
            console.error(`❌ Erro ao enviar mensagem ${message.id}: ${result.error}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Erro no scheduler:', error);
  }
}

export function startScheduler() {
  // Run every minute
  cron.schedule('* * * * *', () => {
    checkAndSendMessages();
  });
  console.log('⏰ Scheduler de mensagens WhatsApp iniciado (verificando a cada minuto)');
}
