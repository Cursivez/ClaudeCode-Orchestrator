@echo off
echo Starting Sequential Thinking MCP SSE Server...
echo =========================================
echo.

REM Start the SSE server in WSL
echo Starting SSE server on port 3001...
start "SSE Server" cmd /k wsl.exe -- bash -c "cd /path/to/cc-mcp/mcp-sequentialthinking-tools && npm install && npm run build && node sse-server-sequential-thinking.js"

REM Wait a moment for the server to start
echo Waiting for server to initialize...
timeout /t 5 /nobreak > nul

REM Start ngrok
echo.
echo Starting ngrok...
start "ngrok" ngrok http 3001

echo.
echo =========================================
echo Both services are starting...
echo.
echo Once ngrok opens, copy the HTTPS URL and add it to Claude.ai:
echo   1. Go to Claude.ai -> Settings -> Integrations
echo   2. Click "Add Integration"
echo   3. Enter: [ngrok-url]/sse (e.g., https://abc123.ngrok.io/sse)
echo   4. Name: "Sequential Thinking MCP"
echo   5. Save
echo.
echo Press any key to close this window (services will continue running)...
pause > nul