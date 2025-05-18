@echo off
echo Starting All MCP Servers...
echo ==========================

echo Starting Claude Code MCP...
start "Claude Code" cmd /k "cd /d C:\repos\cc-mcp\simple-claude-code-mcp && node sse-server-claude.js"

echo Starting Sequential Thinking MCP...
start "Sequential" cmd /k "cd /d C:\repos\cc-mcp\mcp-sequentialthinking-tools && node sse-server-sequential-thinking.js"

echo Starting Proxy Server...
start "Proxy" cmd /k "cd /d C:\repos\cc-mcp && node proxy-server.js"

timeout /t 5

echo Starting ngrok...
start "ngrok" C:\Users\findl\Downloads\ngrok-v3-stable-windows-amd64\ngrok.exe http 8080

echo All services started!
pause