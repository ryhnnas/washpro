FROM node:20-alpine

WORKDIR /app

# Monorepo workspace install (backend only)
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/

RUN npm ci --workspace=backend --include-workspace-root

COPY backend ./backend

WORKDIR /app/backend

RUN npx prisma generate
RUN mkdir -p uploads/payments

ENV NODE_ENV=production
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5000/api/health || exit 1

CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]
