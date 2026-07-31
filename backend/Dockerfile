FROM node:24-alpine AS builder

WORKDIR /app

# Copy root monorepo manifests
COPY package.json tsconfig.json package-lock.json* ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/

# Install all dependencies for build
RUN npm install --legacy-peer-deps

# Copy shared workspace and build it
COPY shared/ ./shared/
RUN npm run shared:build

# Copy backend workspace and build it
COPY backend/ ./backend/
RUN npm run build --workspace=backend

# Production runner stage
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy manifests
COPY package.json tsconfig.json package-lock.json* ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/

# Install production dependencies only
RUN npm install --legacy-peer-deps --only=production

# Copy built code from builder
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/backend/dist ./backend/dist

WORKDIR /app/backend

EXPOSE 3001

CMD ["npm", "run", "start:prod"]
