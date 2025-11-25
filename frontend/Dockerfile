# Multi-stage Dockerfile for Next.js Frontend

# Base stage - Dependencies
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps

RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Development stage
FROM base AS development

WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Set environment variable for Next.js
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Development command
CMD ["npm", "run", "dev"]

# Builder stage - Build the application
FROM base AS builder

WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application code
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED 1

# Build the application
RUN npm run build

# Production stage
FROM base AS production

WORKDIR /app

# Set production environment
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built assets from builder
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# Expose port
EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Production command
CMD ["node", "server.js"]
