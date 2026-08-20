# ---------------------------------------------------------------- base
FROM node:22-alpine AS base
WORKDIR /app
# Prisma needs OpenSSL at runtime.
RUN apk add --no-cache openssl

# ------------------------------------------------------------- builder
FROM base AS builder

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

# ---------------------------------------------------------- production
FROM base AS production
ENV NODE_ENV=production

# node_modules is copied from the builder because it holds the generated
# Prisma client; ts-node (a dev dependency) is what runs the seed script.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/tsconfig.json ./
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/api/v1/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["./docker-entrypoint.sh"]
