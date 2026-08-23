# ========== Stage 1: Build frontend ==========
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY bilimedia-frontend/package.json bilimedia-frontend/package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY bilimedia-frontend/ ./
RUN npm run build

# ========== Stage 2: Build backend ==========
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend

COPY bilimedia-backend/package.json bilimedia-backend/package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY bilimedia-backend/tsconfig.json ./
COPY bilimedia-backend/src ./src
RUN npm run build

# ========== Stage 3: Production ==========
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=80
ENV BILIMEDIA_DATA_DIR=/app/data

# Install production deps only
COPY bilimedia-backend/package.json bilimedia-backend/package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund

# Copy compiled backend
COPY --from=backend-builder /app/backend/dist ./dist

# Copy frontend build into the expected static path
COPY --from=frontend-builder /app/frontend/dist ./public

# Data directory for JSON storage
RUN mkdir -p /app/data

EXPOSE 80

# Override the FE_DIST path in the compiled code: use /app/public
# The backend resolves FE_DIST as ../../bilimedia-frontend/dist relative to dist/,
# which would be /app/../bilimedia-frontend/dist — not correct in container.
# We patch it via env: BILIMEDIA_FRONTEND_DIST
ENV BILIMEDIA_FRONTEND_DIST=/app/public

CMD ["node", "dist/index.js"]
