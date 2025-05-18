@echo off
echo Starting Sequential Thinking MCP SSE Server (Localhost Only)...
echo =========================================================
echo.

REM Start the SSE server in WSL
echo Starting SSE server on port 3001...
start "SSE Server" cmd /k wsl.exe -- bash -c "cd /path/to/cc-mcp/mcp-sequentialthinking-tools && npm install && npm run build && PORT=3001 node sse-server-sequential-thinking.js"

echo.
echo =========================================================
echo SSE Server is starting on http://localhost:3001
echo.
echo To expose this server to the internet:
echo   1. Run ngrok separately: ngrok http 3001
echo   2. Copy the HTTPS URL from ngrok
echo   3. Add to Claude.ai Integrations: [ngrok-url]/sse
echo.
echo Press any key to close this window (server will continue running)...
pause > nul