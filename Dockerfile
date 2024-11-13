# Stage 1: Dependencies
FROM node:20.11.1-alpine3.19 AS deps
RUN apk add --no-cache libc6-compat netcat-openbsd
WORKDIR /app

# Install Yarn
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Stage 2: Builder
FROM node:20.11.1-alpine3.19 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN yarn prisma generate

# Build application
RUN yarn build

# Stage 3: Runner
FROM node:20.11.1-alpine3.19 AS runner
RUN apk add --no-cache netcat-openbsd
WORKDIR /app

# Install production dependencies
COPY package.json yarn.lock ./
RUN yarn install --production --frozen-lockfile

# Copy necessary files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma
COPY .env ./

# Add OpenSSL for Prisma
RUN apk add --no-cache openssl

# Create wait-for script
COPY wait-for.sh ./wait-for.sh
RUN chmod +x ./wait-for.sh

# Create start script
RUN echo "#!/bin/sh" > ./start.sh && \
    echo "./wait-for.sh postgres:5432 -- yarn prisma migrate deploy" >> ./start.sh && \
    echo "node dist/main" >> ./start.sh && \
    chmod +x ./start.sh

EXPOSE 3000
CMD ["./start.sh"]