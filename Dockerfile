# Production Dockerfile for Toon Car Racing 3D (Portainer / Docker)
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Install dependencies
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy application source
COPY . .

# Optional: docker build --build-arg VITE_BASE_PATH=/ralli/
ARG VITE_BASE_PATH=./
ENV VITE_BASE_PATH=$VITE_BASE_PATH

# Build Vite frontend and compile Express+WebSocket backend bundle
RUN npm run build

# Production Runner stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy package manifests and production dependencies
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

# Copy compiled frontend and bundled server from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/server.js ./server.js

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/rooms || exit 1

CMD ["node", "dist/server.cjs"]
