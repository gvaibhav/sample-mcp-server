# Simple MCP Server

A comprehensive Model Context Protocol (MCP) server implementation with advanced capabilities including sampling, elicitation, and roots support.

## Features

### Core Capabilities
- **Sampling**: Server can request LLM completions from connected clients
- **Elicitation**: Interactive user input collection for complex workflows
- **Roots**: Root directory management for file operations
- **Tools**: File operations and AI-powered text processing
- **Resources**: Dynamic and static resource serving
- **Prompts**: Reusable prompt templates
- **Notifications**: Real-time activity notifications

### Tools (4 available)

1. **read-file** - Read content from files
2. **write-file** - Write content to files with append support
3. **summarize-text** - AI-powered text summarization using sampling
4. **interactive-booking** - Interactive booking with user input via elicitation

### Resources (3 types)

1. **server-info** (`info://server`) - Static server information
2. **file://{path}** - Dynamic file content serving
3. **dir://{path}** - Directory listing with metadata

### Prompts (3 templates)

1. **analyze-file** - File content analysis prompt
2. **dev-workflow** - Development workflow guidance
3. **server-status** - Comprehensive server status report

### Roots Support

The server provides access to the current working directory as a root, enabling:
- File system navigation
- Directory structure understanding  
- Secure file operations within bounds

## Usage

### Testing with MCP Inspector

```bash
# Build the server
npm run build

# Start MCP Inspector
npx @modelcontextprotocol/inspector node build/index.js
```

### Testing Individual Features

#### Sampling (summarize-text tool)
```json
{
  "name": "summarize-text",
  "arguments": {
    "text": "Your text to summarize here...",
    "maxTokens": 200
  }
}
```

#### Elicitation (interactive-booking tool)
```json
{
  "name": "interactive-booking", 
  "arguments": {
    "service": "restaurant",
    "date": "2024-12-25",
    "partySize": 4
  }
}
```

#### Roots
Access via "roots/list" to see available root directories.

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Start server
npm start

# Development mode
npm run dev
```

## Architecture

- **Transport**: stdio protocol for MCP communication
- **Security**: File access restricted to current directory
- **Error Handling**: Comprehensive error catching and reporting
- **Logging**: Activity logging via stderr (doesn't interfere with stdio)

## API Reference

The server implements the full MCP specification with extensions for:
- Sampling requests to connected LLM clients
- Elicitation requests for interactive user input
- Roots listing for file system access

All operations are logged and tracked for debugging and monitoring purposes.

## Testing the New Features

### 1. Sampling Feature
Use the `summarize-text` tool with the provided `sample-text.md` file:

```bash
# In MCP Inspector, call the tool:
Tool: summarize-text
Arguments: {
  "text": "content of sample-text.md",
  "maxTokens": 150
}
```

### 2. Elicitation Feature  
Use the `interactive-booking` tool to see interactive prompts:

```bash
# In MCP Inspector, call the tool:
Tool: interactive-booking
Arguments: {
  "service": "restaurant",
  "date": "2024-12-25", 
  "partySize": 2
}
```

### 3. Roots Feature
List available root directories:

```bash
# In MCP Inspector, use the roots/list method
```

## VS Code Integration

The server includes VS Code MCP configuration in `.vscode/mcp.json` for easy integration with VS Code MCP features.