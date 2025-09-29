#!/usr/bin/env node
/**
 * Enhanced MCP Server launcher with HTTP Transport Support
 * Supports both stdio and HTTP/SSE transports
 */
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from 'url';

// Configuration
const TRANSPORT = process.env.MCP_TRANSPORT || "stdio";
const HTTP_PORT = parseInt(process.env.HTTP_PORT || "8080");
const HTTP_HOST = process.env.HTTP_HOST || "0.0.0.0";

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  if (TRANSPORT === "http") {
    // Start HTTP transport
    console.error(`Starting MCP server with HTTP transport on ${HTTP_HOST}:${HTTP_PORT}`);
    
    // Start Python HTTP transport as subprocess
    const pythonProcess = spawn("python3", [
      path.join(__dirname, "http_server.py"),
      "--host", HTTP_HOST,
      "--port", HTTP_PORT.toString(),
      "--server", path.join(__dirname, "index.js")
    ], {
      stdio: ["pipe", "inherit", "inherit"]
    });
    
    pythonProcess.on("error", (err) => {
      console.error("Failed to start HTTP transport:", err);
      process.exit(1);
    });
    
    pythonProcess.on("exit", (code) => {
      console.error(`HTTP transport exited with code ${code}`);
      process.exit(code || 0);
    });
    
    // Handle graceful shutdown
    process.on("SIGINT", () => {
      console.error("Shutting down HTTP transport...");
      pythonProcess.kill("SIGTERM");
      process.exit(0);
    });
    
  } else {
    // Default to stdio transport - run the original index.js
    console.error("Starting MCP server with stdio transport");
    
    const serverProcess = spawn("node", [path.join(__dirname, "index.js")], {
      stdio: "inherit"
    });
    
    serverProcess.on("error", (err) => {
      console.error("Failed to start MCP server:", err);
      process.exit(1);
    });
    
    serverProcess.on("exit", (code) => {
      process.exit(code || 0);
    });
  }
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});