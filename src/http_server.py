#!/usr/bin/env python3
"""
HTTP Bridge for MCP Server
Connects HTTP/SSE transport to the existing Node.js MCP server via stdio
"""
import asyncio
import json
import logging
import subprocess
import argparse
from typing import Optional, Dict, Any
from http_transport import HTTPTransport, HTTPTransportConfig

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MCPHTTPBridge:
    """Bridge between HTTP transport and stdio MCP server."""
    
    def __init__(self, server_path: str):
        self.server_path = server_path
        self.process: Optional[subprocess.Popen] = None
        self.transport: Optional[HTTPTransport] = None
        
    async def start_mcp_server(self):
        """Start the Node.js MCP server process."""
        try:
            self.process = subprocess.Popen(
                ["node", self.server_path],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            logger.info(f"Started MCP server process: {self.server_path}")
        except Exception as e:
            logger.error(f"Failed to start MCP server: {e}")
            raise
            
    async def handle_mcp_request(
        self, request: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle MCP JSON-RPC request."""
        if not self.process:
            return {"error": "MCP server not started"}
            
        try:
            # Send request to MCP server
            request_json = json.dumps(request) + "\\n"
            self.process.stdin.write(request_json)
            self.process.stdin.flush()
            
            # Read response
            response_line = self.process.stdout.readline()
            if response_line:
                return json.loads(response_line.strip())
            else:
                return {"error": "No response from MCP server"}
                
        except Exception as e:
            logger.error(f"Error handling MCP request: {e}")
            return {"error": str(e)}
            
    async def start_http_transport(self, host: str, port: int):
        """Start HTTP transport server."""
        config = HTTPTransportConfig(host=host, port=port)
        self.transport = HTTPTransport(config)
        
        # Set the MCP handler
        self.transport.set_mcp_handler(self.handle_mcp_request)
        
        logger.info(f"Starting HTTP transport on {host}:{port}")
        await self.transport.start()
        
    async def start(self, host: str, port: int):
        """Start both MCP server and HTTP transport."""
        await self.start_mcp_server()
        await self.start_http_transport(host, port)
        
    def stop(self):
        """Stop the MCP server process."""
        if self.process:
            self.process.terminate()
            self.process.wait()
            logger.info("MCP server process stopped")


async def main():
    parser = argparse.ArgumentParser(description="MCP HTTP Bridge")
    parser.add_argument("--host", default="0.0.0.0", help="HTTP host")
    parser.add_argument("--port", type=int, default=8080, help="HTTP port")
    parser.add_argument("--server", default="../build/index.js",
                        help="Path to MCP server")
    
    args = parser.parse_args()
    
    bridge = MCPHTTPBridge(args.server)
    
    try:
        await bridge.start(args.host, args.port)
    except KeyboardInterrupt:
        logger.info("Shutting down...")
    finally:
        bridge.stop()

if __name__ == "__main__":
    asyncio.run(main())