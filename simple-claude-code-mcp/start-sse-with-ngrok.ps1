# Claude Code MCP SSE Server Startup Script
Write-Host "Starting Claude Code MCP SSE Server..." -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Start the SSE server in WSL
Write-Host "Starting SSE server on port 3000..." -ForegroundColor Yellow
$sseJob = Start-Job -ScriptBlock {
    wsl.exe bash -c "export CC_USER_DIRECTORY='/path/to/project/directory' && export CLAUDE_EXECUTABLE_PATH='/path/to/claude/executable' && export DEBUG='mcp:*' && cd /path/to/cc-mcp/simple-claude-code-mcp && node sse-server-claude.js"
}

# Give the server time to start
Write-Host "Waiting for server to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Start ngrok
Write-Host "Starting ngrok..." -ForegroundColor Yellow
$ngrokPath = "ngrok"
Start-Process -FilePath $ngrokPath -ArgumentList "http 3000"

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Both services are starting..." -ForegroundColor Green
Write-Host ""
Write-Host "Once ngrok opens, copy the HTTPS URL and add it to Claude.ai:" -ForegroundColor White
Write-Host "  1. Go to Claude.ai -> Settings -> Integrations" -ForegroundColor Gray
Write-Host "  2. Click 'Add Integration'" -ForegroundColor Gray
Write-Host "  3. Enter: [ngrok-url]/sse (e.g., https://abc123.ngrok.io/sse)" -ForegroundColor Gray
Write-Host "  4. Name: 'ClaudeCode MCP'" -ForegroundColor Gray
Write-Host "  5. Save" -ForegroundColor Gray
Write-Host ""
Write-Host "Press Ctrl+C to stop the services..." -ForegroundColor Yellow

# Keep the script running and show SSE server output
Receive-Job -Job $sseJob -Wait