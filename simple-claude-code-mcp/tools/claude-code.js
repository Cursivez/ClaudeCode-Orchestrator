/**
 * tools/claude-code.js
 * General-purpose Claude Code tool for running commands and prompts
 */
import { executeClaudeCli } from "../utils/claude-cli.js";
import { formatPathsInText } from "../utils/path-formatter.js";

/**
 * General-purpose Claude Code tool configuration
 */
export const claudeCodeTool = {
  name: "ClaudeCode",
  description: "Run Claude Code commands and prompts through WSL with proper environment setup.",
  inputSchema: {
    type: "object",
    properties: {
      prompt: {
        type: "string",
        description: "A prompt to send to Claude Code"
      },
      command: {
        type: "string",
        description: "Direct command to pass to Claude CLI (excluding 'claude' itself)"
      },
      allowedTools: {
        type: "array",
        items: {
          type: "string"
        },
        description: "List of tools Claude Code is allowed to use"
      },
      timeout: {
        type: "number",
        description: "Maximum execution time in milliseconds (default: 180000)"
      }
    },
    required: []
  },
  handler: async (args) => {
    try {
      console.error("ClaudeCode handler called with args:", JSON.stringify(args));
      
      // Parse inputs
      let prompt = args.prompt;
      const command = args.command;
      const allowedTools = args.allowedTools || ["Bash", "Read", "Edit"];
      const timeout = args.timeout || 180000;
      
      if (!prompt && !command) {
        throw new Error("Either prompt or command must be provided");
      }
      
      // Format any file paths in the prompt to Claude Code format
      if (prompt) {
        prompt = formatPathsInText(prompt);
      }
      
      // Execute Claude CLI with the provided arguments
      return await executeClaudeCli({
        prompt,
        command,
        allowedTools,
        timeout,
        logPrefix: "claude-code"
      });
    } catch (error) {
      console.error("Error in claudeCodeTool handler:", error);
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message || String(error)}`
          }
        ],
        isError: true
      };
    }
  }
};