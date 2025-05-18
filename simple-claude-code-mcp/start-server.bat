@echo off
REM Start the Multi-Tool Claude Code MCP Server
REM This script sets the environment variables and starts the server
echo Starting Multi-Tool Claude Code MCP Server...

REM Set environment variables for Claude Code (only if not already set)
if not defined CC_USER_DIRECTORY set CC_USER_DIRECTORY=/path/to/project/directory
if not defined CLAUDE_EXECUTABLE_PATH set CLAUDE_EXECUTABLE_PATH=/path/to/claude/executable
if not defined DEBUG set DEBUG=mcp:*

REM Start the server with the correct WSL path
echo Using wsl.exe to start the server...
echo CC_USER_DIRECTORY: %CC_USER_DIRECTORY%
echo CLAUDE_EXECUTABLE_PATH: %CLAUDE_EXECUTABLE_PATH%
echo DEBUG: %DEBUG%
wsl.exe bash -c "cd /path/to/cc-mcp/simple-claude-code-mcp && export CC_USER_DIRECTORY='%CC_USER_DIRECTORY%' && export CLAUDE_EXECUTABLE_PATH='%CLAUDE_EXECUTABLE_PATH%' && export DEBUG='%DEBUG%' && node index.js"

echo Server stopped.