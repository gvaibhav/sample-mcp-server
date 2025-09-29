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
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

// Configuration
const HTTP_PORT = parseInt(process.env.HTTP_PORT || "8087");
const HTTP_HOST = process.env.HTTP_HOST || "0.0.0.0";

// Store transports by session ID
const transports: Record<string, StreamableHTTPServerTransport> = {};

// Comprehensive MCP Discovery endpoint data
const MCP_DISCOVERY = {
  "modelcontextprotocol": {
    "version": "2024-11-05",
    "server": {
      "name": "simple-mcp-server",
      "version": "1.0.0",
      "description": "A comprehensive MCP server with tools, resources, prompts, sampling, and elicitation capabilities"
    },
    "transports": {
      "http": {
        "url": `http://${HTTP_HOST}:${HTTP_PORT}/mcp`,
        "methods": ["GET", "POST", "DELETE"],
        "capabilities": {
          "streaming": true,
          "sse": true
        }
      }
    },
    "capabilities": {
      "tools": { 
        "listChanged": true,
        "available": [
          {
            "name": "read-file",
            "title": "Read File",
            "description": "Read content from a file",
            "inputSchema": {
              "type": "object",
              "properties": {
                "path": {
                  "type": "string",
                  "description": "The file path to read from"
                }
              },
              "required": ["path"]
            }
          },
          {
            "name": "write-file",
            "title": "Write File",
            "description": "Write content to a file",
            "inputSchema": {
              "type": "object",
              "properties": {
                "path": {
                  "type": "string",
                  "description": "The file path to write to"
                },
                "content": {
                  "type": "string",
                  "description": "The content to write"
                },
                "append": {
                  "type": "boolean",
                  "description": "Whether to append to existing file",
                  "default": false
                }
              },
              "required": ["path", "content"]
            }
          },
          {
            "name": "summarize-text",
            "title": "Summarize Text",
            "description": "Summarize any text using an LLM via sampling",
            "inputSchema": {
              "type": "object",
              "properties": {
                "text": {
                  "type": "string",
                  "description": "Text to summarize"
                },
                "maxTokens": {
                  "type": "number",
                  "description": "Maximum tokens for the summary (default: 200)",
                  "default": 200
                }
              },
              "required": ["text"]
            }
          },
          {
            "name": "interactive-booking",
            "title": "Interactive Booking",
            "description": "Make a booking with interactive user input via elicitation",
            "inputSchema": {
              "type": "object",
              "properties": {
                "service": {
                  "type": "string",
                  "description": "Service to book (e.g., restaurant, hotel)"
                },
                "date": {
                  "type": "string",
                  "description": "Initial booking date"
                },
                "partySize": {
                  "type": "number",
                  "description": "Number of people"
                }
              },
              "required": ["service", "date", "partySize"]
            }
          }
        ]
      },
      "resources": { 
        "listChanged": true,
        "available": [
          {
            "name": "server-info",
            "uri": "info://server",
            "title": "Server Information",
            "description": "Information about this MCP server",
            "mimeType": "application/json"
          },
          {
            "name": "file-content",
            "uriTemplate": "file://{path}",
            "title": "File Content",
            "description": "Read content from a file path",
            "mimeType": "text/plain"
          },
          {
            "name": "directory-listing",
            "uriTemplate": "dir://{path}",
            "title": "Directory Listing", 
            "description": "List contents of a directory",
            "mimeType": "application/json"
          }
        ]
      },
      "prompts": { 
        "listChanged": true,
        "available": [
          {
            "name": "analyze-file",
            "title": "Analyze File",
            "description": "Analyze a file's content and structure",
            "argsSchema": {
              "type": "object",
              "properties": {
                "filepath": {
                  "type": "string",
                  "description": "Path to the file to analyze"
                },
                "focus": {
                  "type": "string",
                  "enum": ["structure", "content", "both"],
                  "description": "What to focus the analysis on",
                  "default": "both"
                }
              },
              "required": ["filepath"]
            }
          },
          {
            "name": "dev-workflow",
            "title": "Development Workflow",
            "description": "Get guidance on development workflow and best practices",
            "argsSchema": {
              "type": "object",
              "properties": {
                "task": {
                  "type": "string",
                  "description": "Development task to get guidance on"
                }
              },
              "required": ["task"]
            }
          },
          {
            "name": "server-status",
            "title": "Server Status",
            "description": "Get comprehensive server status and statistics",
            "argsSchema": {
              "type": "object",
              "properties": {},
              "additionalProperties": false
            }
          }
        ]
      },
      "sampling": {
        "supported": true,
        "description": "Server can request LLM completions from clients for text summarization and analysis"
      },
      "elicitation": {
        "supported": true,
        "description": "Interactive user input collection with schema validation for booking workflows"
      },
      "roots": { 
        "listChanged": true,
        "description": "File system root directory management within security bounds",
        "restrictions": "Access limited to current working directory and subdirectories"
      }
    },
    "authentication": {
      "supported": ["none"],
      "description": "Currently no authentication required. Future versions may support API keys, OAuth2, or bearer tokens",
      "mechanisms": {
        "none": {
          "type": "none",
          "description": "No authentication required for this development server"
        }
      },
      "security": {
        "cors": {
          "enabled": true,
          "origins": ["*"],
          "methods": ["GET", "POST", "OPTIONS", "DELETE"],
          "headers": ["Content-Type", "Authorization", "Mcp-Session-Id", "Accept", "Last-Event-ID", "Mcp-Protocol-Version"]
        },
        "https": {
          "required": false,
          "recommended": true,
          "description": "HTTPS recommended for production deployments"
        },
        "rateLimit": {
          "enabled": false,
          "description": "No rate limiting currently implemented"
        }
      }
    },
    "endpoints": {
      "discovery": "/.well-known/mcp",
      "transport": "/mcp",
      "health": "/health",
      "documentation": "/"
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
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Mcp-Session-Id, Accept, Last-Event-ID, Mcp-Protocol-Version');
    res.header('Access-Control-Expose-Headers', 'Mcp-Session-Id');
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

  // MCP POST handler
  app.post('/mcp', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    
    try {
      // Check if this is an initialization request
      const isInit = req.body && 
                     (isInitializeRequest(req.body) || 
                      (Array.isArray(req.body) && req.body.some(isInitializeRequest)));
      
      if (isInit || !sessionId) {
        // Create new transport for initialization or when no session ID
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sessionId: string) => {
            console.error(`Session initialized with ID: ${sessionId}`);
            transports[sessionId] = transport;
          }
        });

        // Set up onclose handler to clean up transport when closed
        transport.onclose = () => {
          const sid = transport.sessionId;
          if (sid && transports[sid]) {
            console.error(`Transport closed for session ${sid}, removing from transports map`);
            delete transports[sid];
          }
        };

        // Connect the transport to the MCP server
        await server.connect(transport);
        // Pass the pre-parsed body as the third parameter
        await transport.handleRequest(req, res, req.body);
        return;
      } else {
        // Use existing transport for established session
        const transport = transports[sessionId];
        if (!transport) {
          res.status(404).json({
            jsonrpc: '2.0',
            error: {
              code: -32000,
              message: 'Session not found',
            },
            id: null,
          });
          return;
        }
        
        // Pass the pre-parsed body as the third parameter
        await transport.handleRequest(req, res, req.body);
      }
    } catch (error) {
      console.error('Error handling MCP request:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
      }
    }
  });

  // MCP GET handler for SSE streams
  app.get('/mcp', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    
    if (!sessionId || !transports[sessionId]) {
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Invalid or missing session ID',
        },
        id: null,
      });
      return;
    }

    console.error(`Establishing SSE stream for session ${sessionId}`);
    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
  });

  // MCP DELETE handler for session termination
  app.delete('/mcp', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    
    if (!sessionId || !transports[sessionId]) {
      res.status(404).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Session not found',
        },
        id: null,
      });
      return;
    }

    try {
      const transport = transports[sessionId];
      await transport.close();
      delete transports[sessionId];
      console.error(`Session ${sessionId} terminated`);
      
      res.status(200).json({
        jsonrpc: '2.0',
        result: { success: true },
        id: null,
      });
    } catch (error) {
      console.error('Error terminating session:', error);
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  });
  
  // Create HTTP server
  const httpServer = createServer(app);
  
  httpServer.listen(HTTP_PORT, HTTP_HOST, () => {
    console.error(`✅ MCP HTTP server running on http://${HTTP_HOST}:${HTTP_PORT}`);
    console.error(`📋 Discovery endpoint: http://${HTTP_HOST}:${HTTP_PORT}/.well-known/mcp`);
    console.error(`💚 Health check: http://${HTTP_HOST}:${HTTP_PORT}/health`);
  });
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.error('Shutting down HTTP server...');
    
    // Close all active transports
    for (const sessionId in transports) {
      try {
        console.error(`Closing transport for session ${sessionId}`);
        await transports[sessionId].close();
        delete transports[sessionId];
      } catch (error) {
        console.error(`Error closing transport for session ${sessionId}:`, error);
      }
    }
    
    httpServer.close(() => {
      console.error('Server shutdown complete');
      process.exit(0);
    });
  });
}

startHTTPServer().catch((error) => {
  console.error("Failed to start HTTP server:", error);
  process.exit(1);
});