# Backend Dockerfile
FROM node:18.20.2

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    dumb-init \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install npm dependencies
RUN npm install --only=production

# Copy application code
COPY . .

# Fix permissions for node_modules
RUN chown -R node:node /app/node_modules

# Create uploads directory
RUN mkdir -p uploads && \
    chown -R node:node /app

# Create non-root user and switch to it
RUN groupmod -g 1001 node && \
    usermod -u 1001 -g 1001 node

USER node

# Expose port
EXPOSE 5000

# Start application with dumb-init
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "src/server.js"]