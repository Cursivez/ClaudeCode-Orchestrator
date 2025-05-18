/**
 * tools/code-formatter.js
 * Tool for analyzing and formatting code according to best practices
 */
import { executeClaudeCli } from "../utils/claude-cli.js";
import { formatClaudeCodePath } from "../utils/path-formatter.js";

// CodeFormatter prompt template
const CODE_FORMATTER_PROMPT = `You are a precise code formatter focused on improving code quality and readability.

FORMATTING PRINCIPLES:
1. Follow industry standard best practices for the language
2. Maintain consistent style throughout the codebase
3. Improve readability while preserving functionality
4. Remove redundant or unnecessary code
5. Follow the specified formatting rules

TASK:
Format the code in {{FILE_PATH}} according to best practices and the provided formatting rules.

FORMATTING RULES:
{{FORMATTING_RULES}}

Use the available tools to analyze and format the code. Focus only on formatting changes without altering functionality.`;

/**
 * Tools allowed for CodeFormatter
 */
const CODE_FORMATTER_ALLOWED_TOOLS = ["Read", "Edit", "MultiEdit", "Write", "Bash", "LS", "Glob", "Grep"];

/**
 * Code Formatter tool for improving code quality and readability
 */
export const codeFormatterTool = {
  name: "CodeFormatter",
  description: "Analyzes and formats code according to best practices and specified formatting rules.",
  inputSchema: {
    type: "object",
    properties: {
      filePath: {
        type: "string",
        description: "Path to the file to format"
      },
      formattingRules: {
        type: "string",
        description: "Specific formatting rules to apply (optional)"
      },
      language: {
        type: "string",
        description: "Programming language of the file (optional, will be detected if not provided)"
      },
      timeout: {
        type: "number",
        description: "Maximum execution time in milliseconds (optional, default: 120000)"
      }
    },
    required: ["filePath"]
  },
  handler: async (args) => {
    try {
      console.error("CodeFormatter handler called with args:", JSON.stringify(args));
      
      // Parse inputs
      const filePath = args.filePath;
      const formattingRules = args.formattingRules || "- Apply consistent indentation\n- Use appropriate spacing\n- Follow naming conventions\n- Organize imports and dependencies\n- Remove unused code and comments";
      const language = args.language || "";
      const timeout = args.timeout || 120000;
      
      if (!filePath) {
        throw new Error("filePath must be provided");
      }
      
      // Format the file path to Claude Code format
      const formattedFilePath = formatClaudeCodePath(filePath);
      
      // Format the prompt with the file path and formatting rules
      let formattedPrompt = CODE_FORMATTER_PROMPT
        .replace("{{FILE_PATH}}", formattedFilePath)
        .replace("{{FORMATTING_RULES}}", formattingRules);
        
      // Add language if provided
      if (language) {
        formattedPrompt += `\n\nLANGUAGE: ${language}`;
      }
      
      // Execute Claude CLI with the CodeFormatter prompt
      return await executeClaudeCli({
        prompt: formattedPrompt,
        allowedTools: CODE_FORMATTER_ALLOWED_TOOLS,
        timeout,
        logPrefix: "code-formatter"
      });
    } catch (error) {
      console.error("Error in codeFormatterTool handler:", error);
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