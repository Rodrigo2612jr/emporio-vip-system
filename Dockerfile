# Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Production
FROM node:20-alpine
WORKDIR /app/backend

# Instalar dependências do backend
COPY backend/package*.json ./
RUN npm ci

# Copiar código do backend
COPY backend/src ./src
COPY backend/tsconfig.json ./
COPY backend/prisma ./prisma

# Gerar Prisma client
RUN npx prisma generate

# Copiar frontend build
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

# Criar pasta de dados, uploads e auth do WhatsApp
RUN mkdir -p /app/backend/data /app/backend/uploads /app/backend/data/whatsapp_auth

ENV NODE_ENV=production

CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx prisma/seed.ts && npx tsx src/server.ts"]
