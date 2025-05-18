#!/bin/bash

echo "Starting Claude Code MCP SSE Server..."
echo "====================================="
echo

# Start the SSE server
echo "Starting SSE server on port 3000..."
export CC_USER_DIRECTORY='/path/to/project/directory'
export CLAUDE_EXECUTABLE_PATH='/path/to/claude/executable'
export DEBUG='mcp:*'
cd "$(dirname "$0")"
node sse-server-claude.js &
SSE_PID=$!

# Give the server time to start
echo "Waiting for server to initialize..."
sleep 3

# Start ngrok
echo
echo "Starting ngrok..."
ngrok http 3000 &
NGROK_PID=$!

echo
echo "====================================="
echo "Both services are running..."
echo
echo "Once ngrok opens, copy the HTTPS URL and add it to Claude.ai:"
echo "  1. Go to Claude.ai -> Settings -> Integrations"
echo "  2. Click 'Add Integration'"
echo "  3. Enter: [ngrok-url]/sse (e.g., https://abc123.ngrok.io/sse)"
echo "  4. Name: 'ClaudeCode MCP'"
echo "  5. Save"
echo
echo "Press Ctrl+C to stop all services..."

# Trap SIGINT and kill both processes
trap "kill $SSE_PID $NGROK_PID; exit" INT

# Wait for any process to exit
wait