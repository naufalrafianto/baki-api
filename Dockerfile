# Base image
FROM node:20-alpine

# Install yarn
RUN apk add --no-cache yarn

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Bundle app source
COPY . .

# Generate Prisma Client
RUN yarn prisma generate

# Build the application
RUN yarn build

# Set node env
ENV NODE_ENV production

# Expose port
EXPOSE 3001

# Start the server
CMD ["yarn", "start:prod"]