/**
 * Simple Claude Code MCP Server
 * Provides multiple specialized Claude Code tools as MCP tools
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import path from "path";
import os from "os";
import { checkIfRunningInWsl } from "./utils/claude-cli.js";

// Import all tools
import { claudeCodeTool } from "./tools/claude-code.js";
import { contextEngineTool } from "./tools/context-engine.js";
import { codeEditorTool } from "./tools/code-editor.js";
import { codeReviewerTool } from "./tools/code-reviewer.js";
import { codeFormatterTool } from "./tools/code-formatter.js";

// Version information
const VERSION = "1.2.0";

// Collect all tools in an array for easy registration
const allTools = [
  claudeCodeTool,
  contextEngineTool,
  codeEditorTool,
  codeReviewerTool,
  codeFormatterTool
];

// Tool lookup map for easy access
const toolsMap = new Map(allTools.map(tool => [tool.name, tool]));

// Initialize server
const server = new Server(
  {
    name: "MultiToolClaudeCodeMCPServer",
    version: VERSION,
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: allTools.map(tool => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema
  }))
}));

// Register tool handlers
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;
    
    // Look up the tool by name
    const tool = toolsMap.get(name);
    
    if (tool) {
      console.error(`Handling request for tool: ${name}`);
      return tool.handler(args);
    }
    
    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    console.error("Error handling tool call:", error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`
        }
      ],
      isError: true
    };
  }
});

// Write startup log
const startupLogFile = path.join(os.tmpdir(), "claude-code-mcp", "server-startup.log");
try {
  const tempDir = path.join(os.tmpdir(), "claude-code-mcp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  fs.writeFileSync(startupLogFile, `Server started at ${new Date().toISOString()}\n`);
  fs.appendFileSync(startupLogFile, `Running in WSL: ${checkIfRunningInWsl()}\n`);
  fs.appendFileSync(startupLogFile, `Available tools: ${allTools.map(t => t.name).join(", ")}\n`);
  fs.appendFileSync(startupLogFile, `Node.js version: ${process.version}\n`);
  fs.appendFileSync(startupLogFile, `Current directory: ${process.cwd()}\n`);
  fs.appendFileSync(startupLogFile, `Environment variables:\n${JSON.stringify(process.env, null, 2)}\n`);
} catch (error) {
  console.error("Error writing startup log:", error);
}

// Start server
async function runServer() {
  try {
    console.error("Starting Multi-Tool MCP server...");
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Multi-Tool Claude Code MCP Server running on stdio");
  } catch (error) {
    console.error("Error connecting server:", error);
  }
}

// Run the server
runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});