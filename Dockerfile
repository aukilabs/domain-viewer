# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git bash curl build-base

# Install Rust toolchain — the @sparkjsdev/spark git dep's "prepare" script
# compiles WASM from Rust source (npm always runs prepare for git deps,
# --ignore-scripts does NOT skip it).
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y \
    && . /root/.cargo/env \
    && rustup target add wasm32-unknown-unknown
ENV PATH="/root/.cargo/bin:${PATH}"

COPY package*.json ./
RUN npm ci --loglevel verbose 2>&1 || (echo "=== NPM DEBUG LOG ===" && cat /root/.npm/_logs/*-debug-0.log 2>/dev/null && exit 1)
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set correct permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]