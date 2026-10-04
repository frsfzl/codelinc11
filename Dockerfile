# Install dependencies and fetch/build assets before the offline runtime starts.
FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
    LINC_STANDALONE=1 \
    CI=1
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    HOME=/app/.runtime \
    TMPDIR=/app/.runtime/tmp \
    XDG_CONFIG_HOME=/app/.runtime/config \
    XDG_CACHE_HOME=/app/.runtime/cache \
    ELEVENLABS_USE_CLI=false

# All writable paths belong to the app and to the unprivileged runtime user.
RUN mkdir -p .next/cache .runtime/tmp .runtime/config .runtime/cache \
    && chown -R node:node /app
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node
EXPOSE 3000

# No package manager, build, downloads, or credentials are needed at startup.
CMD ["node", "server.js"]
