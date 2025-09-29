#!/usr/bin/env node
/**
 * HTTP Server for MCP using official StreamableHTTP transport
 * Includes proper MCP discovery endpoint and health checks
 */
import { server } from "./index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { randomUUID } from "crypto";

// Configuration
const HTTP_PORT = parseInt(process.env.HTTP_PORT || "8087");
const HTTP_HOST = process.env.HTTP_HOST || "0.0.0.0";

// MCP Discovery endpoint data
const MCP_DISCOVERY = {
  "modelcontextprotocol": {
    "version": "2024-11-05",
    "transports": {
      "http": {
        "url": `http://${HTTP_HOST}:${HTTP_PORT}/mcp`,
        "methods": ["GET", "POST"],
        "capabilities": {
          "streaming": true
        }
      }
    },
    "capabilities": {
      "tools": { "listChanged": true },
      "resources": { "listChanged": true },
      "prompts": { "listChanged": true },
      "sampling": {},
      "elicitation": {},
      "roots": { "listChanged": true }
    }
  }
};

async function startHTTPServer() {
  console.error(`Starting MCP HTTP server on ${HTTP_HOST}:${HTTP_PORT}`);
  
  // Create Express app
  const app = express();
  app.use(express.json());
  
  // CORS middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });
  
  // MCP Discovery endpoint (.well-known/mcp)
  app.get('/.well-known/mcp', (req: Request, res: Response) => {
    res.json(MCP_DISCOVERY);
  });
  
  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      transport: 'http',
      version: '1.0.0',
      capabilities: MCP_DISCOVERY.modelcontextprotocol.capabilities,
      timestamp: new Date().toISOString()
    });
  });
  
  // Root endpoint info
  app.get('/', (req: Request, res: Response) => {
    res.json({
      name: 'Simple MCP Server',
      version: '1.0.0',
      transport: 'HTTP with Server-Sent Events',
      endpoints: {
        discovery: '/.well-known/mcp',
        health: '/health',
        mcp: '/mcp'
      }
    });
  });
  
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Set up StreamableHTTP transport
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: async (sessionId: string) => {
      console.error(`New MCP session initialized: ${sessionId}`);
    },
    onsessionclosed: async (sessionId: string) => {
      console.error(`MCP session closed: ${sessionId}`);
    }
  });
  
  // Handle MCP requests
  app.use('/mcp', (req: Request, res: Response) => {
    transport.handleRequest(req, res);
  });
  
  // Start the MCP server with HTTP transport
  await server.connect(transport);
  
  httpServer.listen(HTTP_PORT, HTTP_HOST, () => {
    console.error(`✅ MCP HTTP server running on http://${HTTP_HOST}:${HTTP_PORT}`);
    console.error(`📋 Discovery endpoint: http://${HTTP_HOST}:${HTTP_PORT}/.well-known/mcp`);
    console.error(`💚 Health check: http://${HTTP_HOST}:${HTTP_PORT}/health`);
  });
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.error('Shutting down HTTP server...');
    httpServer.close(() => {
      process.exit(0);
    });
  });
}

startHTTPServer().catch((error) => {
  console.error("Failed to start HTTP server:", error);
  process.exit(1);
});