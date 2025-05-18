# Claude Code Orchestrator

A Multi-Context Protocol (MCP) server that provides Claude.ai with specialized tools for code editing, formatting, reviewing, and context analysis through SSE (Server-Sent Events).

I also included the sequential thinking (https://github.com/spences10/mcp-sequentialthinking-tools) mcp sse as I use it. Feel free to not use it and remove it from the Orchestrator's system prompt.

## ⚠️ Important: Path Configuration Required

This codebase has been prepared for open source release. **ALL PATHS in the codebase are placeholders** and must be updated with your actual paths before the server will run.

## Prerequisites

- Node.js installed
- ngrok installed (download from https://ngrok.com) - its free
- Claude Pro/Team/Enterprise account with Integration access

## Quick Start

```bash
# Windows
./start-all-simple.bat

# Linux/macOS
./start-all-simple.sh
```

## Required Path Updates

Before running the server, you must update the following placeholder paths throughout the codebase:

TIP: easiest way to do this is using the built in search and replace tool in VSC. You can also ask claude code to make the changes for you.

### 1. Project Directory Path
- **Placeholder**: `/path/to/project/directory`
- **Replace with**: Your actual working directory where your projects are located
- **Example**: `/home/username/projects` or `C:/Users/username/projects`

### 2. Claude CLI Executable Path
- **Placeholder**: `/path/to/claude/executable`
- **Replace with**: Full path to your Claude CLI executable
- **Example**: `/home/username/.nvm/versions/node/v22.15.0/bin/claude`

### 3. Repository Root Path
- **Placeholder**: `/path/to/cc-mcp`
- **Replace with**: Full path to this repository on your system
- **Example**: `/home/username/repos/cc-mcp` or `C:/Users/username/repos/cc-mcp`

### 4. Node.js Bin Directory
- **Placeholder**: `/path/to/node/bin`
- **Replace with**: Path to your Node.js bin directory
- **Example**: `/home/username/.nvm/versions/node/v22.15.0/bin`

### 5. ngrok Executable
- **Placeholder**: `ngrok` (assumes it's in your system PATH)
- **Replace with**: Full path to ngrok if it's not in your PATH
- **Example**: `C:/tools/ngrok/ngrok.exe`

## Files That Need Path Updates

You need to update paths in the following files:

### Configuration Files
- `simple-claude-code-mcp/claude-config-fix.json`
- `config.template.json` (use as a template)

### Batch Files (Windows)
- `simple-claude-code-mcp/start-server.bat`
- `simple-claude-code-mcp/start-sse-server.bat`
- `simple-claude-code-mcp/start-sse-with-ngrok.bat`
- `mcp-sequentialthinking-tools/start-sse-server.bat`
- `mcp-sequentialthinking-tools/start-sse-with-ngrok.bat`

### Shell Scripts (Linux/macOS)
- `simple-claude-code-mcp/start-server.sh`
- `simple-claude-code-mcp/start-sse-with-ngrok.sh`
- `mcp-sequentialthinking-tools/start-sse-with-ngrok.sh`

### PowerShell Scripts
- `simple-claude-code-mcp/start-sse-with-ngrok.ps1`
- `mcp-sequentialthinking-tools/start-sse-with-ngrok.ps1`

### Source Code Files
- `simple-claude-code-mcp/utils/claude-cli.js`
- `simple-claude-code-mcp/sse-server-claude.js`

## Environment Variables

Set these environment variables before running:

```bash
export CC_USER_DIRECTORY="/your/actual/project/directory"
export CLAUDE_EXECUTABLE_PATH="/your/actual/claude/executable/path"
export DEBUG="mcp:*"  # Optional: Enable debug logging
```

## Installation

1. Clone the repository
2. Update all placeholder paths as described above
3. Install dependencies:
   ```bash
   npm install
   cd simple-claude-code-mcp && npm install
   cd ../mcp-sequentialthinking-tools && npm install && npm run build
   ```

## Running the Server

The server runs via SSE (Server-Sent Events) and can be started with:

```bash
# Windows
./start-all-simple.bat

# Linux/macOS
./start-all-simple.sh
```

This will start both the Claude Code MCP server and the Sequential Thinking tools server.

## Features

- **Claude Code Tool**: General-purpose code interaction
- **Context Engine**: Code context analysis
- **Code Editor**: Precise code editing
- **Code Reviewer**: Code review and analysis
- **Code Formatter**: Code formatting
- **Sequential Thinking**: Advanced problem-solving tools

## Integration with Claude.ai

To use with Claude.ai:

1. Start the server using `./start-all-simple.bat`
2. If you need external access, use ngrok:
   ```bash
   ngrok http 3000
   ```
3. Add the integration in Claude.ai:
   - Go to Settings → Integrations
   - Click "Add Integration"
   - Enter your server URL (local or ngrok)
   - Name it "Claude Code MCP"
   - Save

## Troubleshooting

1. **"Path not found" errors**: Make sure you've updated ALL placeholder paths
2. **"Command not found" errors**: Ensure executables are in your PATH or use full paths
3. **Permission errors**: Make scripts executable with `chmod +x script.sh`
4. **WSL issues**: Ensure WSL is properly installed and configured

## Security

See `SECURITY.md` for information about the security measures taken in preparing this codebase for open source release.

## License

MIT License - see LICENSE file for details
