# Sequential Thinking Tools SSE MCP Server

This is an SSE (Server-Sent Events) implementation of the Sequential Thinking Tools MCP server that allows integration with Claude.ai web interface.

## Features

- OAuth2 authentication flow for Claude.ai integration
- Server-Sent Events (SSE) for real-time communication
- Sequential thinking process with tool recommendations
- Complete MCP protocol implementation

## Prerequisites

- Node.js v16 or higher
- npm or yarn
- ngrok (for exposing local server to the internet)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Build the TypeScript files:
```bash
npm run build
```

## Starting the Server

### Windows Users

#### Option 1: Start with ngrok (Recommended)
```bash
start-sse-with-ngrok.bat
```
This will:
- Start the SSE server on port 3001
- Automatically launch ngrok to create a public URL
- Display integration instructions

#### Option 2: Start server only
```bash
start-sse-server.bat
```
Then run ngrok separately:
```bash
ngrok http 3001
```

### Linux/macOS Users

Make the script executable:
```bash
chmod +x start-sse-with-ngrok.sh
```

Then run:
```bash
./start-sse-with-ngrok.sh
```

### PowerShell Users
```powershell
./start-sse-with-ngrok.ps1
```

## Integration with Claude.ai

1. Start the server using one of the methods above
2. Wait for ngrok to provide a public HTTPS URL (e.g., `https://abc123.ngrok.io`)
3. Go to [Claude.ai](https://claude.ai)
4. Navigate to Settings → Integrations
5. Click "Add Integration"
6. Enter the integration details:
   - URL: `[ngrok-url]/sse` (e.g., `https://abc123.ngrok.io/sse`)
   - Name: `Sequential Thinking MCP`
7. Save the integration

## Available Endpoints

- `GET /.well-known/oauth-authorization-server` - OAuth discovery endpoint
- `POST /register` - Client registration endpoint
- `GET /oauth/authorize` - OAuth authorization endpoint
- `POST /oauth/token` - OAuth token endpoint
- `GET /sse` - Server-Sent Events endpoint for MCP communication
- `POST /command` - Command endpoint for MCP messages

## How It Works

The Sequential Thinking Tools help Claude break down complex problems into manageable steps through a structured thinking process:

1. **Problem Analysis**: Breaks down the problem into discrete steps
2. **Tool Recommendations**: Suggests appropriate tools for each step
3. **Progress Tracking**: Maintains history of thoughts and decisions
4. **Adaptive Thinking**: Can revise and branch thoughts as understanding deepens
5. **Verification**: Validates hypotheses against the chain of thought

## Environment Variables

- `PORT` - Server port (default: 3001)

## Troubleshooting

### Server won't start
- Make sure port 3001 is not in use
- Check that all dependencies are installed
- Ensure TypeScript files are built (`npm run build`)

### Integration not working
- Verify ngrok is running and providing an HTTPS URL
- Check that the URL in Claude.ai includes `/sse` at the end
- Make sure the server is running before adding the integration

### Connection drops
- The server includes keep-alive functionality
- If connections still drop, check your network stability

## Development

To modify the server:

1. Edit the source files in `src/`
2. Rebuild: `npm run build`
3. Restart the server

## License

MIT