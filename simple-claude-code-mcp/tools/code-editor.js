/**
 * tools/code-editor.js
 * Implementation-focused tool for precise code editing tasks
 */
import { executeClaudeCli } from "../utils/claude-cli.js";
import { formatClaudeCodePath, formatClaudeCodePaths, formatPathsInText } from "../utils/path-formatter.js";

// CodeEditor prompt template
const CODE_EDITOR_PROMPT = `You are a precise, minimalist code editor focused on implementing exactly what is requested with no additional features.

PRINCIPLES:
1. Implement EXACTLY what is specified - nothing more, nothing less
2. Write clean, efficient, readable code with helpful comments
3. Follow existing code patterns and standards in the project
4. Create only what is absolutely necessary to solve the problem
5. Don't add speculative features or "technical debt"

IMPLEMENTATION APPROACH:
1. Carefully analyze the requirements
2. Systematically implement each step of the plan
3. Add clear, informative comments explaining key decisions
4. Follow standard best practices for the language/framework
5. Format code consistently with the existing codebase

CONSISTENCY REQUIREMENTS:
1. Maintain consistency with other files being edited as part of this task
2. Follow project-wide conventions for naming, formatting, and structure
3. Ensure compatibility between interrelated components
4. Use the same patterns and approaches as seen in the codebase
5. When in doubt, prioritize consistency with existing code over introducing new patterns

TASK DESCRIPTION:
{{TASK}}

FILE PATH TO EDIT:
{{FILE_PATH}}

{{CODE_CONTEXT}}

Use the available tools to edit the file and execute the task. Focus only on the changes needed to fulfill the requirements.`;

/**
 * Tools allowed for CodeEditor
 */
const CODE_EDITOR_ALLOWED_TOOLS = ["Read", "Edit", "MultiEdit", "Write", "Bash", "LS", "Glob", "Grep", "Task", "Batch", "TodoRead", "TodoWrite"];

/**
 * Code Editor tool for focused code implementation
 */
export const codeEditorTool = {
  name: "CodeEditor",
  description: "Implementation-focused tool for precise code editing tasks. Creates or modifies code following exact specifications.",
  inputSchema: {
    type: "object",
    properties: {
      filePath: {
        type: "string",
        description: "Path to the file to edit or create"
      },
      task: {
        type: "string",
        description: "Detailed implementation instructions"
      },
      codeContext: {
        type: "string",
        description: "Relevant code context for the implementation (optional). This should include information about other related files, specific code patterns to follow, and how this file integrates with others being modified in the same task."
      },
      relatedFiles: {
        type: "array",
        items: {
          type: "string"
        },
        description: "List of related files that should be referenced for consistency (optional)"
      },
      timeout: {
        type: "number",
        description: "Maximum execution time in milliseconds (optional, default: 900000)"
      }
    },
    required: ["filePath", "task"]
  },
  handler: async (args) => {
    try {
      console.error("CodeEditor handler called with args:", JSON.stringify(args));
      
      // Parse inputs
      const filePath = args.filePath;
      const task = args.task;
      let codeContext = args.codeContext || "";
      const relatedFiles = args.relatedFiles || [];
      const timeout = args.timeout || 900000;
      
      if (!filePath || !task) {
        throw new Error("Both filePath and task must be provided");
      }
      
      // Format the main file path to Claude Code format
      const formattedFilePath = formatClaudeCodePath(filePath);
      
      // Format related file paths
      const formattedRelatedFiles = formatClaudeCodePaths(relatedFiles);
      
      // Add related files section to the context if provided
      if (formattedRelatedFiles.length > 0) {
        codeContext += codeContext ? "\n\n" : "";
        codeContext += "RELATED FILES TO REFERENCE FOR CONSISTENCY:\n";
        codeContext += formattedRelatedFiles.map(file => `- ${file}`).join("\n");
        codeContext += "\n\nUse the Read tool to examine these files before making changes to ensure consistency.";
      }
      
      // Format any paths in the code context
      codeContext = formatPathsInText(codeContext);
      
      // Format the prompt with the task and file path
      let formattedPrompt = CODE_EDITOR_PROMPT
        .replace("{{TASK}}", task)
        .replace("{{FILE_PATH}}", formattedFilePath)
        .replace("{{CODE_CONTEXT}}", codeContext ? `\nRELEVANT CODE CONTEXT:\n${codeContext}` : "");
      
      // Execute Claude CLI with the CodeEditor prompt
      const result = await executeClaudeCli({
        prompt: formattedPrompt,
        allowedTools: CODE_EDITOR_ALLOWED_TOOLS,
        timeout,
        logPrefix: "code-editor"
      });
      
      // Check if we got a "(no content)" response which is normal for CodeEditor tasks
      if (result && 
          result.content && 
          result.content.length === 1 && 
          result.content[0].text === "(no content)\n") {
        // Run a follow-up query to summarize the changes
        console.error("Automatically running follow-up query to summarize changes");
        try {
          const summaryPrompt = "Summarize the changes you just made concisely, focusing on the key modifications and their purpose.";
          const summaryResult = await executeClaudeCli({
            command: `--continue -p "${summaryPrompt.replace(/"/g, '\\"').replace(/'/g, "'\\''")}"`,
            allowedTools: CODE_EDITOR_ALLOWED_TOOLS,
            timeout: 60000, // Shorter timeout for summary
            logPrefix: "code-editor-summary"
          });
          
          // If we got a valid summary, return it
          if (summaryResult?.content?.[0]?.text && 
              summaryResult.content[0].text.trim() !== '') {
            return summaryResult;
          }
          
          // Fallback if summary failed
          return {
            content: [
              {
                type: "text",
                text: "File edited successfully. No additional output was returned."
              }
            ],
            isError: false,
            metadata: result.metadata || {}
          };
        } catch (error) {
          console.error("Error getting edit summary:", error);
          // Fallback to original message on error
          return {
            content: [
              {
                type: "text",
                text: "File edited successfully. No additional output was returned."
              }
            ],
            isError: false,
            metadata: result.metadata || {}
          };
        }
      }
      
      return result;
    } catch (error) {
      console.error("Error in codeEditorTool handler:", error);
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