# ---------------------------------------------------------------- builder
# Vite 8 requires Node >= 20.19; 22 LTS matches the backend image.
FROM node:22-alpine AS builder
WORKDIR /app

# The API base URL is inlined into the bundle at build time by Vite, so it must
# be the address a visitor's browser can reach.
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ------------------------------------------------------------- production
FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
