# MCP Server HTTP Transport & Docker Guide

This guide explains how to use the Enhanced MCP Server with HTTP/SSE transport and Docker containerization.

## Features Added

### HTTP Transport
- **FastAPI-based HTTP server** with JSON-RPC over HTTP
- **Server-Sent Events (SSE)** for real-time streaming
- **CORS support** for browser compatibility
- **Health check endpoints** for monitoring
- **Parallel deployment** alongside original stdio transport

### Docker Support
- **Multi-stage Docker build** for optimized images
- **Docker Compose** with nginx reverse proxy
- **Environment variable configuration**
- **Health checks** and logging
- **Development and production profiles**

## Quick Start

### 1. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies for HTTP transport
pip install -r requirements.txt
```

### 2. Build the Server

```bash
npm run build
```

### 3. Run with Different Transports

#### Stdio Transport (Original)
```bash
# Direct stdio
npm start

# Or using the launcher
MCP_TRANSPORT=stdio node build/server.js
```

#### HTTP Transport
```bash
# Using npm script
npm run start:http

# Or manually
MCP_TRANSPORT=http HTTP_HOST=0.0.0.0 HTTP_PORT=8080 node build/server.js

# Or directly with Python
python3 src/http_server.py --host 0.0.0.0 --port 8080 --server build/index.js
```

## Docker Usage

### Build and Run Container

```bash
# Build the Docker image
npm run docker:build

# Run the container
npm run docker:run

# Or manually
docker build -t simple-mcp-server .
docker run -p 8080:8080 simple-mcp-server
```

### Docker Compose (Recommended)

```bash
# Start with docker-compose
npm run docker:compose

# Or manually
docker-compose up

# Production with nginx
docker-compose --profile production up
```

### Environment Variables

Create a `.env` file (copy from `.env.example`):

```bash
NODE_ENV=production
MCP_SERVER_NAME=simple-mcp-server
MCP_LOG_LEVEL=info
HTTP_PORT=8080
EXTERNAL_PORT=80
EXTERNAL_HTTPS_PORT=443
```

## HTTP API Reference

### Base URL
```
http://localhost:8080
```

### Endpoints

#### Health Check
```http
GET /health
```
Response:
```json
{
  "status": "healthy",
  "transport": "http"
}
```

#### JSON-RPC over HTTP
```http
POST /mcp
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {
      "name": "http-client",
      "version": "1.0.0"
    }
  }
}
```

#### Server-Sent Events Stream
```http
GET /mcp/stream
Accept: text/event-stream
```

This endpoint provides real-time updates and heartbeat messages.

### Example HTTP Client (Python)

```python
import requests
import json

# Initialize the server
response = requests.post('http://localhost:8080/mcp', json={
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
        "protocolVersion": "2024-11-05",
        "capabilities": {},
        "clientInfo": {"name": "python-client", "version": "1.0.0"}
    }
})

print("Initialize response:", response.json())

# Use a tool
response = requests.post('http://localhost:8080/mcp', json={
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
        "name": "read-file",
        "arguments": {"path": "README.md"}
    }
})

print("Tool response:", response.json())
```

### Example HTTP Client (JavaScript)

```javascript
// Initialize connection
const initResponse = await fetch('http://localhost:8080/mcp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'js-client', version: '1.0.0' }
    }
  })
});

const initResult = await initResponse.json();
console.log('Initialize result:', initResult);

// Use SSE for real-time updates
const eventSource = new EventSource('http://localhost:8080/mcp/stream');
eventSource.onmessage = function(event) {
  console.log('SSE message:', JSON.parse(event.data));
};
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MCP_TRANSPORT` | `stdio` | Transport type: `stdio` or `http` |
| `HTTP_HOST` | `0.0.0.0` | HTTP server bind address |
| `HTTP_PORT` | `8080` | HTTP server port |
| `NODE_ENV` | `development` | Node.js environment |
| `MCP_SERVER_NAME` | `simple-mcp-server` | Server identifier |
| `MCP_LOG_LEVEL` | `info` | Logging level |

### Docker Configuration

The `docker-compose.yml` supports multiple profiles:

- **Default**: Basic MCP server with HTTP transport
- **Production**: Includes nginx reverse proxy with SSL support

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run specific test modules
python -m unittest tests.test_http_transport -v
```

### Development Mode

```bash
# stdio transport
npm run dev

# HTTP transport
npm run dev:http
```

### Debugging

Enable debug logging:
```bash
MCP_LOG_LEVEL=debug npm run start:http
```

View container logs:
```bash
docker-compose logs -f mcp-server
```

## Production Deployment

### 1. Build Production Image

```bash
docker build -t simple-mcp-server:latest .
```

### 2. Deploy with Compose

```bash
# Copy environment template
cp .env.example .env

# Edit configuration
nano .env

# Deploy with nginx
docker-compose --profile production up -d
```

### 3. SSL/TLS Setup

Place SSL certificates in the `ssl/` directory:
- `ssl/cert.pem` - SSL certificate
- `ssl/key.pem` - Private key

Update `nginx.conf` to enable the SSL server block.

### 4. Monitoring

Health checks are automatically configured. Monitor with:

```bash
# Container health
docker ps

# Application health
curl http://localhost:8080/health

# Logs
docker-compose logs -f
```

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure port 8080 is not in use
2. **Python dependencies**: Install `pip install fastapi uvicorn`
3. **Docker permissions**: Use `sudo` if needed on Linux
4. **CORS issues**: Configure `cors_origins` in `HTTPTransportConfig`

### Debug Commands

```bash
# Check if server is responding
curl -f http://localhost:8080/health

# Test JSON-RPC endpoint
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"ping"}'

# View container logs
docker logs simple-mcp-server

# Check port binding
netstat -tlnp | grep 8080
```

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   HTTP Client   │────│  FastAPI Server  │────│  Node.js MCP    │
│                 │    │  (Python)        │    │  Server         │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌──────────────────┐              │
         └──────────────│  Server-Sent     │──────────────┘
                        │  Events (SSE)    │
                        └──────────────────┘
```

The HTTP transport acts as a bridge between HTTP/SSE clients and the original stdio-based MCP server, providing full compatibility while adding web-based accessibility.

## Integration Examples

### VS Code Extension

```json
{
  "mcpServers": {
    "simple-mcp-http": {
      "command": "node",
      "args": ["build/server.js"],
      "env": {
        "MCP_TRANSPORT": "http",
        "HTTP_PORT": "8080"
      }
    }
  }
}
```

### Browser Integration

```html
<!DOCTYPE html>
<html>
<head>
    <title>MCP Web Client</title>
</head>
<body>
    <script>
        // Connect via SSE
        const eventSource = new EventSource('http://localhost:8080/mcp/stream');
        
        // Send JSON-RPC requests
        async function callMCP(method, params) {
            const response = await fetch('http://localhost:8080/mcp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: Date.now(),
                    method,
                    params
                })
            });
            return response.json();
        }
    </script>
</body>
</html>
```

This implementation provides full HTTP/SSE transport support while maintaining backward compatibility with the original stdio transport, enabling both traditional MCP usage and modern web-based integrations.