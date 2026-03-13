# Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Build backend
FROM node:20-alpine AS backend-build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npx prisma generate

# Production
FROM node:20-alpine
WORKDIR /app

COPY --from=backend-build /app/backend ./backend
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

WORKDIR /app/backend

# Criar pasta de dados para SQLite persistente
RUN mkdir -p /app/backend/data

ENV NODE_ENV=production

EXPOSE ${PORT:-3002}

CMD ["sh", "-c", "npx prisma migrate deploy && node --import tsx src/server.ts"]
