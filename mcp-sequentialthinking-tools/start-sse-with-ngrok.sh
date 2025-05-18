#!/bin/bash

# Start Sequential Thinking MCP SSE Server with ngrok

echo "Starting Sequential Thinking MCP SSE Server..."
echo "========================================="
echo

# Navigate to the project directory
cd /path/to/cc-mcp/mcp-sequentialthinking-tools

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the TypeScript project
echo "Building TypeScript files..."
npm run build

# Start the SSE server in the background
echo "Starting SSE server on port 3001..."
node sse-server-sequential-thinking.js &
SSE_PID=$!

# Wait for server to start
echo "Waiting for server to initialize..."
sleep 5

# Start ngrok
echo
echo "Starting ngrok..."
ngrok http 3001

# When user exits ngrok, kill the SSE server
kill $SSE_PID

echo "All services stopped."