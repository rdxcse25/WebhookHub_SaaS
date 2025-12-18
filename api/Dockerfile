# -----------------------------
# Base image
# -----------------------------
FROM node:20-alpine AS base

WORKDIR /app

# -----------------------------
# Install dependencies (cached)
# -----------------------------
FROM base AS deps

COPY package.json package-lock.json ./
RUN npm ci --only=production

# -----------------------------
# Build stage
# -----------------------------
FROM base AS build

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# -----------------------------
# Production runtime
# -----------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy only what is needed
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./

# Expose API port
EXPOSE 8080

# Run the compiled JS
CMD ["node", "dist/server.js"]
