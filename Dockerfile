# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git bash curl build-base

# Install Rust toolchain (needed by @sparkjsdev/spark git dep to compile WASM)
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y \
    && . /root/.cargo/env \
    && rustup target add wasm32-unknown-unknown
ENV PATH="/root/.cargo/bin:${PATH}"

COPY package*.json ./

# Install deps without lifecycle scripts (spark git dep's prepare script
# requires lefthook which isn't needed in Docker and causes failures).
# Then manually build only the spark WASM inside node_modules.
RUN npm ci --ignore-scripts && \
    cd node_modules/@sparkjsdev/spark && npm run build:wasm
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