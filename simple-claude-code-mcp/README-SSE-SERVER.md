# Claude Code MCP SSE Server

This SSE (Server-Sent Events) server allows you to connect the Claude Code MCP tools to Claude.ai using ngrok.

## Prerequisites

- Node.js installed
- ngrok installed (download from https://ngrok.com)
- Claude Pro/Team/Enterprise account with Integration access

## Quick Start (One Command)

Simply run:
```bash
./start-sse-with-ngrok.bat
```

This will:
1. Start the SSE server on port 3000
2. Launch ngrok to expose the server
3. Display the ngrok URL for Claude.ai integration

## Manual Setup (Two Terminals)

If you prefer to run the commands separately:

### Terminal 1: Start the SSE Server
```bash
cd simple-claude-code-mcp
node sse-server-claude.js
```

The server will start on http://localhost:3000

### Terminal 2: Run ngrok
```bash
ngrok http 3000
```

Copy the HTTPS forwarding URL (e.g., https://abc123.ngrok.io)

## Adding to Claude.ai

1. Go to Claude.ai → Settings → Integrations
2. Click "Add Integration"
3. Enter the ngrok HTTPS URL with `/sse` endpoint
   - Example: `https://abc123.ngrok.io/sse`
4. Name: "ClaudeCode MCP" (or your preferred name)
5. Save the integration

## Available Tools

Once connected, you'll have access to these tools:

- **ContextEngine**: Search and analyze code in your repository
- **CodeEditor**: Make precise code edits
- **CodeReviewer**: Review code changes for implementation plans
- **CodeFormatter**: Format code according to project style
- **ClaudeCode**: Execute general Claude Code commands

## Testing the Connection

After adding the integration, you can test it by asking Claude to:
- "What repository are you in?"
- "Show me the README file"
- "List the files in this project"

## Troubleshooting

### Server doesn't start
- Check if port 3000 is already in use
- Ensure you're in the correct directory

### ngrok issues
- Make sure ngrok is properly installed and in your PATH
- Check if you need to authenticate ngrok with `ngrok authtoken YOUR_TOKEN`

### Integration not working
- Verify the URL includes the `/sse` endpoint
- Check the console logs in both terminals for errors
- Ensure your Claude account has Integration access

## Environment Variables

The server uses these environment variables (automatically set by the startup script):
- `CC_USER_DIRECTORY`: Your working directory (defaults to /mnt/c/repos/metatrader-sftp)
- `CLAUDE_EXECUTABLE_PATH`: Path to Claude CLI
- `DEBUG`: Set to "mcp:*" for debug logging