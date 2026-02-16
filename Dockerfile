# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git bash

COPY package*.json ./

# --ignore-scripts: the @sparkjsdev/spark git dep's "prepare" script tries to
#   compile Rust WASM and install lefthook — neither is needed, dist/ is pre-built.
# --force: the sparkjs repo has a devDependency on "file:rust/spark-internal-rs/pkg"
#   which doesn't exist until the WASM is built; --force lets npm continue past this.
RUN npm ci --ignore-scripts --force
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