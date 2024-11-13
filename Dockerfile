###################
# BUILD FOR LOCAL DEVELOPMENT
###################
FROM node:20-alpine AS development

# Create app directory
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image.
COPY --chown=node:node package*.json yarn.lock ./

# Copy Prisma schema files first
COPY --chown=node:node prisma ./prisma/

# Install app dependencies using Yarn
RUN yarn install --frozen-lockfile

# Generate Prisma client
RUN yarn prisma generate

# Bundle app source
COPY --chown=node:node . .

# Use the node user from the image (instead of the root user)
USER node

###################
# BUILD FOR PRODUCTION
###################
FROM node:20-alpine AS build

WORKDIR /usr/src/app

COPY --chown=node:node package*.json yarn.lock ./
COPY --chown=node:node prisma ./prisma/

# In order to run `yarn build`, we need access to the dependencies
COPY --chown=node:node --from=development /usr/src/app/node_modules ./node_modules
COPY --chown=node:node . .

# Run the build command which creates the production bundle
RUN yarn build

# Set NODE_ENV environment variable
ENV NODE_ENV production

# Running `yarn install` removes the existing node_modules directory
# Passing in --production ensures that only the production dependencies are installed
RUN yarn install --production --frozen-lockfile && yarn cache clean

# Generate Prisma client for production
RUN yarn prisma generate

USER node

###################
# PRODUCTION
###################
FROM node:20-alpine AS production

# Set working directory
WORKDIR /usr/src/app

# Copy the bundled code from the build stage to the production image
COPY --chown=node:node --from=build /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=build /usr/src/app/dist ./dist
COPY --chown=node:node --from=build /usr/src/app/package.json ./
COPY --chown=node:node --from=build /usr/src/app/prisma ./prisma

# Set environment variables for Prisma
ENV DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}?schema=public

USER node

# Create entrypoint script
RUN echo '#!/bin/sh\nset -e\n\n# Run Prisma migrations\nyarn prisma migrate deploy\n\n# Start the application\nexec node dist/main.js' > docker-entrypoint.sh && \
    chmod +x docker-entrypoint.sh

ENTRYPOINT ["./docker-entrypoint.sh"]