@echo off
echo Starting Claude Code MCP SSE Server...
echo =====================================
echo.

REM Start the SSE server in WSL
echo Starting SSE server on port 3000...
start "SSE Server" cmd /k wsl.exe -- bash -c "export CC_USER_DIRECTORY='/path/to/project/directory' && export CLAUDE_EXECUTABLE_PATH='/path/to/claude/executable' && export DEBUG='mcp:*' && cd /path/to/cc-mcp/simple-claude-code-mcp && npm install && node sse-server-claude.js"

REM Wait a moment for the server to start
echo Waiting for server to initialize...
timeout /t 5 /nobreak > nul

REM Start ngrok
echo.
echo Starting ngrok...
start "ngrok" ngrok http 3000

echo.
echo =====================================
echo Both services are starting...
echo.
echo Once ngrok opens, copy the HTTPS URL and add it to Claude.ai:
echo   1. Go to Claude.ai -> Settings -> Integrations
echo   2. Click "Add Integration"
echo   3. Enter: [ngrok-url]/sse (e.g., https://abc123.ngrok.io/sse)
echo   4. Name: "ClaudeCode MCP"
echo   5. Save
echo.
echo Press any key to close this window (services will continue running)...
pause > nul