#!/usr/bin/env node
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListRootsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { promises as fs } from "fs";
import { resolve, join } from "path";
import { existsSync } from "fs";

// Server configuration
const SERVER_NAME = "simple-mcp-server";
const SERVER_VERSION = "1.0.0";

// Storage for server state
const serverState = {
  lastWriteTime: new Date().toISOString(),
  writeCount: 0,
  notificationsSent: 0
};

// Create the MCP server
const server = new McpServer({
  name: SERVER_NAME,
  version: SERVER_VERSION,
  capabilities: {
    tools: { listChanged: true },
    resources: { listChanged: true },
    prompts: { listChanged: true },
    sampling: {},
    elicitation: {},
    roots: { listChanged: true }
  }
});

// Helper function to log activities (uses stderr to avoid interfering with stdio protocol)
function logActivity(message: string, level: "info" | "error" = "info") {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
  serverState.notificationsSent++;
}

/**
 * TOOLS SECTION
 * Implements read and write tools as requested
 */

// Read Tool - Reads content from files
server.registerTool(
  "read-file",
  {
    title: "Read File",
    description: "Read content from a file",
    inputSchema: {
      path: z.string().describe("The file path to read from")
    }
  },
  async ({ path }) => {
    try {
      const resolvedPath = resolve(path);
      
      // Security check - only allow reading from current directory and subdirectories
      const cwd = process.cwd();
      if (!resolvedPath.startsWith(cwd)) {
        throw new Error("Access denied: Cannot read files outside current directory");
      }

      if (!existsSync(resolvedPath)) {
        throw new Error(`File not found: ${path}`);
      }

      const content = await fs.readFile(resolvedPath, "utf8");
      logActivity(`File read successfully: ${path}`);
      
      return {
        content: [{
          type: "text",
          text: `File: ${path}\nContent:\n${content}`
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logActivity(`Error reading file ${path}: ${errorMessage}`, "error");
      
      return {
        content: [{
          type: "text",
          text: `Error reading file: ${errorMessage}`
        }],
        isError: true
      };
    }
  }
);

// Write Tool - Writes content to files
server.registerTool(
  "write-file",
  {
    title: "Write File", 
    description: "Write content to a file",
    inputSchema: {
      path: z.string().describe("The file path to write to"),
      content: z.string().describe("The content to write"),
      append: z.boolean().optional().describe("Whether to append to the file (default: false)")
    }
  },
  async ({ path, content, append = false }) => {
    try {
      const resolvedPath = resolve(path);
      
      // Security check - only allow writing to current directory and subdirectories
      const cwd = process.cwd();
      if (!resolvedPath.startsWith(cwd)) {
        throw new Error("Access denied: Cannot write files outside current directory");
      }

      if (append) {
        await fs.appendFile(resolvedPath, content, "utf8");
      } else {
        await fs.writeFile(resolvedPath, content, "utf8");
      }

      // Update server state
      serverState.lastWriteTime = new Date().toISOString();
      serverState.writeCount++;

      const action = append ? "appended to" : "written to";
      logActivity(`Content ${action} file: ${path}`);

      return {
        content: [{
          type: "text",
          text: `Successfully ${action} file: ${path}\nContent length: ${content.length} characters`
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logActivity(`Error writing to file ${path}: ${errorMessage}`, "error");
      
      return {
        content: [{
          type: "text",
          text: `Error writing file: ${errorMessage}`
        }],
        isError: true
      };
    }
  }
);

// Summarize Tool - Uses LLM sampling to summarize text
server.registerTool(
  "summarize-text",
  {
    title: "Summarize Text",
    description: "Summarize any text using an LLM via sampling",
    inputSchema: {
      text: z.string().describe("Text to summarize"),
      maxTokens: z.number().optional().describe("Maximum tokens for the summary (default: 200)")
    }
  },
  async ({ text, maxTokens = 200 }) => {
    try {
      // Call the LLM through MCP sampling
      const response = await server.server.createMessage({
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Please provide a concise summary of the following text:\n\n${text}`,
            },
          },
        ],
        maxTokens,
      });

      logActivity(`Text summarized: ${text.length} characters -> summary generated`);

      return {
        content: [
          {
            type: "text",
            text: response.content.type === "text" ? response.content.text : "Unable to generate summary",
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logActivity(`Error summarizing text: ${errorMessage}`, "error");
      return {
        content: [{
          type: "text",
          text: `Error summarizing text: ${errorMessage}`
        }],
        isError: true
      };
    }
  }
);

// Interactive Booking Tool - Uses elicitation for user input
server.registerTool(
  "interactive-booking",
  {
    title: "Interactive Booking",
    description: "Make a booking with interactive user input via elicitation",
    inputSchema: {
      service: z.string().describe("Service to book (e.g., restaurant, hotel)"),
      date: z.string().describe("Initial booking date"),
      partySize: z.number().describe("Number of people")
    }
  },
  async ({ service, date, partySize }) => {
    try {
      // Simulate checking availability
      const available = Math.random() > 0.5; // Random availability for demo

      if (!available) {
        // Ask user if they want to try alternative dates using elicitation
        const result = await server.server.elicitInput({
          message: `No availability for ${service} on ${date} for ${partySize} people. Would you like to check alternative dates?`,
          requestedSchema: {
            type: "object",
            properties: {
              tryAlternatives: {
                type: "boolean",
                title: "Try Alternatives",
                description: "Would you like to see alternative dates?"
              },
              preferredDate1: {
                type: "string",
                title: "First Alternative Date",
                description: "First alternative date (YYYY-MM-DD format)"
              },
              preferredDate2: {
                type: "string",
                title: "Second Alternative Date", 
                description: "Second alternative date (YYYY-MM-DD format)"
              },
              maxPrice: {
                type: "number",
                title: "Maximum Price",
                description: "Maximum price you're willing to pay"
              }
            },
            required: ["tryAlternatives"]
          }
        });

        if (result.action === "accept" && result.content && typeof result.content === 'object' && 'tryAlternatives' in result.content && result.content.tryAlternatives) {
          const alternatives: string[] = [];
          if (result.content.preferredDate1 && typeof result.content.preferredDate1 === 'string') {
            alternatives.push(result.content.preferredDate1);
          }
          if (result.content.preferredDate2 && typeof result.content.preferredDate2 === 'string') {
            alternatives.push(result.content.preferredDate2);
          }
          
          // Default alternatives if none provided
          if (alternatives.length === 0) {
            alternatives.push(new Date(Date.now() + 86400000).toISOString().split('T')[0]);
            alternatives.push(new Date(Date.now() + 172800000).toISOString().split('T')[0]);
          }
          
          const maxPrice = (result.content.maxPrice && typeof result.content.maxPrice === 'number') 
            ? ` (max price: $${result.content.maxPrice})` 
            : '';
          
          logActivity(`User requested alternatives for ${service} booking`);
          
          return {
            content: [{
              type: "text",
              text: `Found alternative dates for ${service}:\n${alternatives.map((d: string) => `- ${d}`).join('\n')}${maxPrice}\n\nBooking confirmed for first available date!`
            }]
          };
        } else {
          return {
            content: [{
              type: "text",
              text: `No booking made. Original date ${date} not available for ${service}.`
            }]
          };
        }
      }

      logActivity(`Booking confirmed: ${service} on ${date} for ${partySize} people`);

      return {
        content: [{
          type: "text",
          text: `✅ Booking confirmed!\nService: ${service}\nDate: ${date}\nParty size: ${partySize} people`
        }]
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logActivity(`Error with booking: ${errorMessage}`, "error");
      return {
        content: [{
          type: "text",
          text: `Error making booking: ${errorMessage}`
        }],
        isError: true
      };
    }
  }
);

/**
 * RESOURCES SECTION
 * Implements various resources for context sharing
 */

// Static resource - Server information
server.registerResource(
  "server-info",
  "info://server",
  {
    title: "Server Information",
    description: "Information about this MCP server",
    mimeType: "application/json"
  },
  async () => ({
    contents: [{
      uri: "info://server",
      mimeType: "application/json",
      text: JSON.stringify({
        name: SERVER_NAME,
        version: SERVER_VERSION,
        description: "A simple MCP server for testing",
        capabilities: ["read-file", "write-file"],
        uptime: new Date().toISOString(),
        state: serverState
      }, null, 2)
    }]
  })
);

// Dynamic resource template - File contents
server.registerResource(
  "file-content",
  new ResourceTemplate("file://{path}", { list: undefined }),
  {
    title: "File Content",
    description: "Read content from a file path"
  },
  async (uri, { path }) => {
    try {
      const pathStr = Array.isArray(path) ? path[0] : path;
      const resolvedPath = resolve(pathStr);
      const cwd = process.cwd();
      
      if (!resolvedPath.startsWith(cwd)) {
        throw new Error("Access denied: Cannot read files outside current directory");
      }

      if (!existsSync(resolvedPath)) {
        throw new Error(`File not found: ${pathStr}`);
      }

      const content = await fs.readFile(resolvedPath, "utf8");
      const stats = await fs.stat(resolvedPath);
      
      return {
        contents: [{
          uri: uri.href,
          mimeType: "text/plain",
          text: content,
          name: pathStr.split("/").pop() || pathStr,
          description: `File size: ${stats.size} bytes, Modified: ${stats.mtime.toISOString()}`
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        contents: [{
          uri: uri.href,
          mimeType: "text/plain",
          text: `Error: ${errorMessage}`
        }]
      };
    }
  }
);

// Directory listing resource
server.registerResource(
  "directory-listing", 
  new ResourceTemplate("dir://{path}", { list: undefined }),
  {
    title: "Directory Listing",
    description: "List contents of a directory"
  },
  async (uri, { path }) => {
    try {
      const pathStr = Array.isArray(path) ? path[0] : path;
      const resolvedPath = resolve(pathStr);
      const cwd = process.cwd();
      
      if (!resolvedPath.startsWith(cwd)) {
        throw new Error("Access denied: Cannot access directories outside current directory");
      }

      if (!existsSync(resolvedPath)) {
        throw new Error(`Directory not found: ${pathStr}`);
      }

      const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
      const listing = entries.map(entry => ({
        name: entry.name,
        type: entry.isDirectory() ? "directory" : "file",
        path: join(pathStr, entry.name)
      }));

      return {
        contents: [{
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(listing, null, 2),
          name: `Directory: ${pathStr}`,
          description: `Contains ${entries.length} entries`
        }]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        contents: [{
          uri: uri.href,
          mimeType: "application/json", 
          text: JSON.stringify({ error: errorMessage }, null, 2)
        }]
      };
    }
  }
);

/**
 * ROOTS SECTION
 * Implements root directories that the server can operate on
 */

// Register roots request handler to provide available root directories
server.server.setRequestHandler(
  ListRootsRequestSchema,
  async () => {
    try {
      const currentDir = process.cwd();
      const stats = await fs.stat(currentDir);
      
      logActivity("Roots list requested");
      
      return {
        roots: [
          {
            uri: `file://${currentDir}`,
            name: "Current Working Directory",
            _meta: {
              description: "The current working directory of the MCP server",
              lastModified: stats.mtime.toISOString(),
              permissions: "read-write"
            }
          }
        ]
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logActivity(`Error listing roots: ${errorMessage}`, "error");
      
      return {
        roots: [],
        _meta: {
          error: errorMessage
        }
      };
    }
  }
);

/**
 * PROMPTS SECTION
 * Implements reusable prompt templates
 */

// File analysis prompt
server.registerPrompt(
  "analyze-file",
  {
    title: "Analyze File",
    description: "Analyze a file's content and structure",
    argsSchema: {
      filepath: z.string().describe("Path to the file to analyze"),
      focus: z.enum(["structure", "content", "both"]).optional().describe("What to focus the analysis on")
    }
  },
  ({ filepath, focus = "both" }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Please analyze the file at "${filepath}" with a focus on ${focus}. 

Use the read-file tool to examine the content, then provide:
1. File overview and structure
2. Key insights about the content
3. Potential improvements or issues
4. Summary of findings

Make sure to be thorough in your analysis.`
      }
    }]
  })
);

// Development workflow prompt
server.registerPrompt(
  "dev-workflow",
  {
    title: "Development Workflow",
    description: "Guide through a development workflow",
    argsSchema: {
      task: z.string().describe("The development task to work on"),
      language: z.string().optional().describe("Programming language (if applicable)")
    }
  },
  ({ task, language }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `I am a helpful development assistant. I need help with the following development task: "${task}"${language ? ` using ${language}` : ""}.

Please:
1. Break down the task into manageable steps
2. Suggest the best approach
3. Help me implement the solution using available tools
4. Review the results

Available tools:
- read-file: Read existing files
- write-file: Create or modify files

Let's work through this systematically.`
      }
    }]
  })
);

// Server status prompt
server.registerPrompt(
  "server-status",
  {
    title: "Server Status",
    description: "Get comprehensive server status and statistics",
    argsSchema: {}
  },
  () => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Please provide a comprehensive status report for this MCP server.

Use the server-info resource to get current statistics, then provide:
1. Server health and uptime
2. Usage statistics 
3. Recent activity summary
4. Available capabilities
5. Performance metrics

Format the response in a clear, organized manner.`
      }
    }]
  })
);

/**
 * SERVER STARTUP AND CONNECTION
 */

async function main() {
  try {
    // Create stdio transport
    const transport = new StdioServerTransport();
    
    // Connect server to transport
    await server.connect(transport);
    
    // Send startup notification
    logActivity(`${SERVER_NAME} v${SERVER_VERSION} started successfully`);
    
    // Log to stderr for debugging (won't interfere with stdio protocol)
    console.error(`${SERVER_NAME} v${SERVER_VERSION} running on stdio transport`);
    console.error("Available tools: read-file, write-file, summarize-text, interactive-booking");
    console.error("Available resources: server-info, file://{path}, dir://{path}");
    console.error("Available prompts: analyze-file, dev-workflow, server-status");
    console.error("Capabilities: sampling, elicitation, roots");
    
  } catch (error) {
    console.error("Failed to start MCP server:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the server
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});