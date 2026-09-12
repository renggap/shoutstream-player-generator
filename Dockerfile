# Build stage
FROM node:20-alpine AS build-env
WORKDIR /app

# Copy package files + npmrc (legacy-peer-deps needed: @react-router/cloudflare
# peers workers-types ^4 while wrangler peers ^5 - no version satisfies both)
COPY package*.json ./
COPY .npmrc ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production-env
WORKDIR /app

# Copy package files + npmrc
COPY package*.json ./
COPY .npmrc ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built assets from build stage
COPY --from=build-env /app/build ./build
COPY --from=build-env /app/public ./public

# Create data directory for slug storage
RUN mkdir -p /app/data

# Set port to 3200
ENV PORT=3200

# Expose port 3200
EXPOSE 3200

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3200/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the server
CMD ["npm", "run", "start"]