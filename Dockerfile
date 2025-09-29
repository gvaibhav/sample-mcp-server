# Multi-stage build for Node.js MCP server with HTTP transport
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build the TypeScript server
RUN npm run build

# Production stage
FROM node:18-alpine AS runtime

# Install Python for HTTP transport
RUN apk add --no-cache python3 py3-pip

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Copy Python HTTP transport module
COPY src/http_transport.py ./src/
COPY requirements.txt ./

# Install Python dependencies
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt

# Create sample files
COPY sample-text.md ./
COPY test.md ./

# Set environment variables
ENV NODE_ENV=production
ENV MCP_SERVER_NAME=simple-mcp-server
ENV MCP_LOG_LEVEL=info
ENV HTTP_HOST=0.0.0.0
ENV HTTP_PORT=8087

# Expose ports
EXPOSE 8087

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8087/health || exit 1

# Default command (can be overridden)
CMD ["node", "build/index.js"]

# Labels
LABEL org.opencontainers.image.title="Simple MCP Server"
LABEL org.opencontainers.image.description="Model Context Protocol server with HTTP transport"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.authors="MCP Team"