# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This repository contains a Multi-tool Claude Code MCP (Model Context Protocol) server that allows Claude Desktop to interact with Claude Code. It provides specialized tools to enhance Claude Code capabilities through MCP integration, enabling operations like code editing, formatting, reviewing, and context analysis.

## Main Components

- **MCP Server**: The main server that handles MCP protocol communication between Claude Desktop and Claude Code
- **Specialized Tools**: Multiple tools for different aspects of code interaction
  - `ClaudeCode`: General-purpose tool for running Claude Code commands
  - `ContextEngine`: Tool for analyzing code contexts and relationships
  - `CodeEditor`: Implementation-focused tool for precise code editing
  - `CodeReviewer`: Tool for reviewing and analyzing code
  - `CodeFormatter`: Tool for formatting code consistently

## Development Commands

### Setup and Installation

```bash
# Install dependencies
npm install

# Install dependencies using bun (recommended)
bun install
```

### Running the Server

```bash
# Start the server using npm
npm start

# Start the server using node directly
node simple-claude-code-mcp/index.js

# Start the server with the shell script (Linux/macOS)
./simple-claude-code-mcp/start-server.sh

# Start the server with the batch script (Windows)
simple-claude-code-mcp/start-server.bat
```

## Environment Configuration

The server uses these environment variables:

- `CC_USER_DIRECTORY`: Directory where user files are located (e.g., "/path/to/project/directory")
- `CLAUDE_EXECUTABLE_PATH`: Path to Claude CLI executable
- `DEBUG`: Enable debug logging with "mcp:*" to see all MCP-related logs


## Architecture Notes

1. **MCP Tools**: The server exposes several specialized tools via MCP protocol:
   - Each tool is defined in its own module under `simple-claude-code-mcp/tools/`
   - Tools share common utilities from `simple-claude-code-mcp/utils/`

2. **Path Formatting**: File paths need to be properly formatted for Claude Code compatibility
   - The `path-formatter.js` utility converts standard paths to Claude Code format (with '@' prefix)
   - Example: "/path/to/file.js" → "@path/to/file.js"

3. **Claude CLI Integration**: The server executes Claude CLI commands with proper environment setup
   - The `claude-cli.js` utility handles executing Claude CLI with appropriate parameters
   - WSL detection and support is built-in for Windows environments

4. **Logging**: Comprehensive logging is implemented for debugging
   - Logs are written to the temp directory at `os.tmpdir()/claude-code-mcp/`
   - Server startup logs, tool execution logs, and error logs are available

## Best Practices

1. When adding new tools, follow the existing pattern:
   - Define tool configuration with name, description, inputSchema, and handler
   - Register the tool in the main `index.js` file by adding it to the `allTools` array

2. When modifying path formatting:
   - Run the path formatter tests to ensure compatibility
   - Maintain @ prefix convention used by Claude Code

3. Error handling:
   - Always wrap tool handlers in try-catch blocks
   - Return structured errors with isError: true flag
   - Log errors with console.error for debugging