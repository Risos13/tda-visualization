# Multi-stage build for React frontend
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps && npm cache clean --force

# Copy source code
COPY . .

# Build arguments for environment variables
ARG VITE_API_URL=/api
ARG VITE_TDA_SERVICE_URL=http://localhost:8000
ARG VITE_DATA_PATH=/data

# Set environment variables for build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_TDA_SERVICE_URL=$VITE_TDA_SERVICE_URL
ENV VITE_DATA_PATH=$VITE_DATA_PATH

# Build the application
RUN npm run build

# Production stage with Nginx
FROM nginx:alpine AS production

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy static data files
COPY public/data /usr/share/nginx/html/data

# Install curl for healthcheck
RUN apk add --no-cache curl

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -fsS http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
