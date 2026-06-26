# --- Build stage: install deps (compiling better-sqlite3) and build the app ---
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# Build tools for the better-sqlite3 native addon.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Runtime stage: minimal image that runs `next start` ---
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Run as a non-root user.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Copy only what `next start` needs at runtime. The SQLite DB is generated at
# startup from src/data/articles.ts (bundled into .next), so no volume is needed.
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/next.config.js ./next.config.js

# Writable directory for the generated knowledge.db.
RUN mkdir -p data && chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000
# Bind 0.0.0.0 and honor the platform-injected PORT (miget, Fly, etc.);
# fall back to 3000 for local runs. Shell form so ${PORT} expands; exec for signals.
CMD ["sh", "-c", "exec ./node_modules/.bin/next start -H 0.0.0.0 -p ${PORT:-3000}"]
