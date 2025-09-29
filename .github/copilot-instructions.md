# Simple MCP Server - GitHub Copilot Instructions

This project is a comprehensive Model Context Protocol (MCP) server implementation with advanced capabilities.

## Project Overview
- **Language**: TypeScript
- **Framework**: MCP SDK (@modelcontextprotocol/sdk) v1.18.0
- **Transport**: stdio protocol
- **Purpose**: Full-featured MCP server for testing client implementations with sampling, elicitation, and roots support

## Key Files
- `src/index.ts` - Main server implementation with all MCP capabilities
- `build/index.js` - Compiled output
- `.vscode/mcp.json` - VS Code MCP configuration
- `package.json` - Node.js dependencies and scripts
- `.gitignore` - Excludes build artifacts and dependencies
- `sample-text.md` - Sample content for testing summarization
- `README.md` - Comprehensive documentation

## Architecture
The server implements the complete MCP specification:

### **Core Capabilities**
1. **Sampling** - Server can request LLM completions from clients
2. **Elicitation** - Interactive user input collection with schema validation
3. **Roots** - File system root directory management

### **Tools (4 available)**
1. **read-file** - Read content from files (security restricted)
2. **write-file** - Write/append content to files (security restricted)
3. **summarize-text** - AI-powered text summarization using sampling
4. **interactive-booking** - Interactive workflows with elicitation

### **Resources (3 types)**
1. **server-info** (`info://server`) - Static server information and statistics
2. **file://{path}** - Dynamic file content serving
3. **dir://{path}** - Directory listing with metadata

### **Prompts (3 templates)**
1. **analyze-file** - File content analysis with context
2. **dev-workflow** - Development workflow guidance
3. **server-status** - Comprehensive server status reporting

### **Roots Support**
- Current working directory as accessible root
- File system navigation within security bounds
- Metadata about available directories

### **Notifications**
- Real-time activity tracking and notifications
- Error reporting and logging
## Development Guidelines
- Follow MCP specification for stdio transport
- Maintain security restrictions (current directory only)
- Use TypeScript strict mode with comprehensive error handling
- Log to stderr (not stdout) to avoid breaking stdio protocol
- Handle all MCP capabilities with proper validation
- Use Zod for schema validation
- Implement proper error responses for all operations
- Practice test-driven development: write or update a failing test before implementing any feature or fix, then refactor with tests staying green.
- When adding Python automation or service code, adopt the built-in `unittest` framework exclusively and avoid introducing `pytest`.

## Security Model
- File operations restricted to current working directory
- Input validation using Zod schemas
- Secure elicitation with schema validation
- Proper error handling and sanitization

## Testing
### Approach
- Every change begins with a failing `unittest` case (or set of cases) that captures the desired behavior before code changes.
- Unit and integration coverage should live under a structured Python package (e.g., `tests/`) executed via `python -m unittest`.

### MCP Inspector
```bash
npm run build
npx @modelcontextprotocol/inspector node build/index.js
```

### Manual Testing
Test individual capabilities:
- **Sampling**: Use `summarize-text` tool
- **Elicitation**: Use `interactive-booking` tool
- **Roots**: Call `roots/list` method
- **Resources**: Access `server-info`, `file://`, `dir://` resources
- **Prompts**: Use `analyze-file`, `dev-workflow`, `server-status` prompts

## Build & Development
- **Build**: `npm run build` - Compiles TypeScript to JavaScript
- **Dev**: `npm run dev` - Build and run in development mode
- **Start**: `npm start` - Build and run server
- **Clean**: `npm run clean` - Remove build directory

## References
- MCP Documentation: https://modelcontextprotocol.io/
- MCP TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk
- MCP Specification: https://spec.modelcontextprotocol.io/
- Sampling Documentation: MCP SDK examples for LLM integration
- Elicitation Documentation: Interactive user input patterns
