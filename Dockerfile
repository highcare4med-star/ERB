
# syntax = docker/dockerfile:1

ARG BUN_VERSION=1.4.4
FROM oven/bun:${BUN_VERSION}-debian AS base

LABEL fly_launch_runtime="Bun"

WORKDIR /app

ENV NODE_ENV="production"

# Build stage
FROM base AS build

# Install build dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    pkg-config \
    python3 \
    python-is-python3 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY bun.lock package.json ./
RUN bun install

# Copy application
COPY . .

# Build application
RUN bun run build

# Remove development dependencies
RUN rm -rf node_modules && \
    bun install --ci

# Final stage
FROM base

WORKDIR /app

ENV NODE_ENV="production"

COPY --from=build /app /app

EXPOSE 3000

CMD ["bun", "run", "start"]
