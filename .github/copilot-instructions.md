# Simple MCP Server - GitHub Copilot Instructions

This project is a Model Context Protocol (MCP) server implementation.

## Project Overview
- **Language**: TypeScript
- **Framework**: MCP SDK (@modelcontextprotocol/sdk)
- **Transport**: stdio
- **Purpose**: Testing MCP client implementations

## Key Files
- `src/index.ts` - Main server implementation
- `build/index.js` - Compiled output
- `.vscode/mcp.json` - VS Code MCP configuration
- `package.json` - Node.js dependencies and scripts

## Architecture
The server implements:
1. **Tools**: read-file, write-file (with security restrictions)
2. **Resources**: server-info, file://{path}, dir://{path} templates  
3. **Prompts**: analyze-file, dev-workflow, server-status templates
4. **Notifications**: Real-time activity notifications

## Development Guidelines
- Follow MCP specification for stdio transport
- Maintain security restrictions (current directory only)
- Use TypeScript strict mode
- Log to stderr (not stdout) to avoid breaking stdio protocol
- Handle errors gracefully with proper error responses

## Testing
Use MCP Inspector: `npx @modelcontextprotocol/inspector node build/index.js`

## References
- MCP Documentation: https://modelcontextprotocol.io/
- MCP TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk
- MCP Specification: https://spec.modelcontextprotocol.io/