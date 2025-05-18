#!/bin/bash
# Start the Multi-Tool Claude Code MCP Server
# This script sets the environment variables and starts the server
echo "Starting Multi-Tool Claude Code MCP Server..."

# Set environment variables for Claude Code
export CC_USER_DIRECTORY="/path/to/project/directory"
export CLAUDE_EXECUTABLE_PATH="/path/to/claude/executable"
export DEBUG="mcp:*"

# Start the server
node index.js

echo "Server stopped."