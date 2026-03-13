import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.user.count();
  if (count > 0) {
    console.log('Seed: usuários já existem, pulando...');
    return;
  }

  const hashedPassword = await bcrypt.hash('123456', 10);
  await prisma.user.create({
    data: {
      name: 'Administrador',
      email: 'admin@emporio.com',
      password: hashedPassword,
      role: 'admin',
    },
  });
  console.log('Seed: admin criado (admin@emporio.com / 123456)');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
