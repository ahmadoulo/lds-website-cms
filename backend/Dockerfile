# Base stage
FROM node:20-alpine AS base
WORKDIR /app
# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Builder stage
FROM base AS builder
COPY package*.json ./
RUN npm ci

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy source and build
COPY . .
RUN npm run build

# Production stage
FROM base AS production
ENV NODE_ENV=production

# Copy dependencies (we could run npm ci --only=production, but we need Prisma client which gets generated into node_modules)
# Alternatively, copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Create a startup script
RUN echo 'npx prisma migrate deploy && node dist/main' > start.sh
RUN chmod +x start.sh

EXPOSE 3000

CMD ["./start.sh"]
