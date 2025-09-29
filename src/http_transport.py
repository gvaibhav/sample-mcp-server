"""
HTTP Transport for MCP Server
Implements HTTP/SSE streaming alongside stdio transport
"""
import asyncio
import json
import logging
from typing import Optional, Callable
from dataclasses import dataclass
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

logger = logging.getLogger(__name__)


@dataclass
class HTTPTransportConfig:
    """Configuration for HTTP transport."""
    host: str = "0.0.0.0"
    port: int = 8080
    cors_origins: Optional[list] = None
    
    def __post_init__(self):
        if self.cors_origins is None:
            self.cors_origins = ["*"]


class HTTPTransport:
    """HTTP transport implementation for MCP server."""
    
    def __init__(self, config: HTTPTransportConfig):
        self.config = config
        self.app = FastAPI(title="MCP Server HTTP Transport")
        self.mcp_handler: Optional[Callable] = None
        self._setup_middleware()
        self._setup_routes()
        
    def _setup_middleware(self):
        """Set up CORS and other middleware."""
        origins = self.config.cors_origins or ["*"]
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=origins,
            allow_credentials=True,
            allow_methods=["GET", "POST", "OPTIONS"],
            allow_headers=["*"],
        )
        
    def _setup_routes(self):
        """Set up HTTP routes for MCP protocol."""
        
        @self.app.post("/mcp")
        async def handle_jsonrpc(request: Request):
            """Handle JSON-RPC requests over HTTP."""
            try:
                body = await request.json()
                if self.mcp_handler:
                    result = await self.mcp_handler(body)
                    return result
                else:
                    return {"error": "MCP handler not configured"}
            except Exception as e:
                logger.error(f"Error handling JSON-RPC request: {e}")
                return {"error": str(e)}
                
        @self.app.get("/mcp/stream")
        async def handle_sse_stream(request: Request):
            """Handle Server-Sent Events streaming."""
            async def event_stream():
                try:
                    while True:
                        # Implement SSE streaming logic
                        timestamp = asyncio.get_event_loop().time()
                        data = json.dumps({
                            "type": "heartbeat",
                            "timestamp": timestamp
                        })
                        yield f"data: {data}\n\n"
                        await asyncio.sleep(30)  # Heartbeat every 30 seconds
                except asyncio.CancelledError:
                    return
                    
            return StreamingResponse(
                event_stream(),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                }
            )
            
        @self.app.get("/health")
        async def health_check():
            """Health check endpoint."""
            return {"status": "healthy", "transport": "http"}
            
    def set_mcp_handler(self, handler: Callable):
        """Set the MCP message handler."""
        self.mcp_handler = handler
        
    async def start(self):
        """Start the HTTP server."""
        config = uvicorn.Config(
            self.app,
            host=self.config.host,
            port=self.config.port,
            log_level="info"
        )
        server = uvicorn.Server(config)
        await server.serve()
        
    def run(self):
        """Run the HTTP server (blocking)."""
        uvicorn.run(
            self.app,
            host=self.config.host,
            port=self.config.port
        )