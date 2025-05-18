# Start Sequential Thinking MCP SSE Server with ngrok

Write-Host "Starting Sequential Thinking MCP SSE Server..." -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""

# Start the SSE server in WSL
Write-Host "Starting SSE server on port 3001..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/k", "wsl.exe -- bash -c `"cd /path/to/cc-mcp/mcp-sequentialthinking-tools && npm install && npm run build && node sse-server-sequential-thinking.js`"" -NoNewWindow

# Wait for server to start
Write-Host "Waiting for server to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Start ngrok
Write-Host ""
Write-Host "Starting ngrok..." -ForegroundColor Yellow
Start-Process "ngrok" -ArgumentList "http", "3001"

# Display instructions
Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "Both services are starting..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Once ngrok opens, copy the HTTPS URL and add it to Claude.ai:" -ForegroundColor White
Write-Host "  1. Go to Claude.ai -> Settings -> Integrations" -ForegroundColor White
Write-Host "  2. Click `"Add Integration`"" -ForegroundColor White
Write-Host "  3. Enter: [ngrok-url]/sse (e.g., https://abc123.ngrok.io/sse)" -ForegroundColor White
Write-Host "  4. Name: `"Sequential Thinking MCP`"" -ForegroundColor White
Write-Host "  5. Save" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")