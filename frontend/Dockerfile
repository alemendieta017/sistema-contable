FROM node:24-alpine AS builder

WORKDIR /app

# Copy root monorepo manifests
COPY package.json tsconfig.json package-lock.json* ./
COPY shared/package.json ./shared/
COPY frontend/package.json ./frontend/

# Install dependencies for build
RUN npm install --legacy-peer-deps

# Copy shared workspace and build it
COPY shared/ ./shared/
RUN npm run shared:build

# Copy frontend codebase
COPY frontend/ ./frontend/

# Build arguments for Next.js public environment variables
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Build Next.js application
RUN npm run build --workspace=frontend

# Production runner stage
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy manifests
COPY package.json tsconfig.json package-lock.json* ./
COPY shared/package.json ./shared/
COPY frontend/package.json ./frontend/

# Install production dependencies
RUN npm install --legacy-peer-deps --only=production

# Copy built code from builder stage
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/frontend/.next ./frontend/.next
COPY --from=builder /app/frontend/public ./frontend/public
COPY --from=builder /app/frontend/next.config.js ./frontend/next.config.js

WORKDIR /app/frontend

EXPOSE 3000

CMD ["npm", "run", "start"]
