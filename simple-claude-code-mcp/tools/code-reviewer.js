/**
 * tools/code-reviewer.js
 * Code review tool that delegates analysis to Claude for more concise feedback
 */
import { executeClaudeCli } from "../utils/claude-cli.js";
import { formatClaudeCodePath, formatClaudeCodePaths, formatPathsInText } from "../utils/path-formatter.js";
import path from "path";
import { posix } from "path";

// Note: We'll get the user directory inside the handler so it picks up runtime environment changes

// CodeReviewer prompt template
const CODE_REVIEWER_PROMPT = `You are a code reviewer. Provide concise but comprehensive feedback by analyzing the code against its implementation plan.

IMPORTANT: You must run the following checks yourself:
1. **TypeScript Check**: For TypeScript files, run \`npx tsc --noEmit\` using the Bash tool to identify type errors
2. **Git Diff**: Use \`git diff\` and \`git diff --staged\` to see exactly what changes were made

REVIEW APPROACH:
1. Verify that the code implements all requirements in the plan
2. Assess code quality, efficiency, and maintainability
3. Look for potential bugs, edge cases, and optimization opportunities
4. Validate that the implementation properly integrates with existing code
5. Provide specific, actionable feedback with clear examples
6. Consider relationships between files and how they work together
7. Use WebSearch to verify code against latest documentation and best practices when applicable

IMPORTANT: When reviewing code that references libraries, frameworks, or APIs, use the WebSearch tool to verify that implementations follow current best practices and documentation. For example, when reviewing React code, search for current React documentation to verify hooks usage, component patterns, etc.

After collecting this information, provide a focused review covering:

1. **Implementation Completeness**: Does the code fully implement the plan?
2. **Code Quality**: Is the code clear, efficient, and maintainable?
3. **Critical Issues** [HIGH]: Type errors, bugs, security vulnerabilities that must be addressed
4. **Potential Issues**: Are there any bugs, edge cases, or performance concerns?
5. **Security & Best Practices**: Does the code follow industry best practices?
6. **Cross-file Consistency**: Are patterns and practices consistent across files?
7. **Documentation Compliance**: Verify code follows latest documentation using WebSearch
8. **Important Improvements** [MEDIUM]: Performance, maintainability, best practices that should be considered
9. **Optional Enhancements** [LOW]: Code style, minor optimizations

IMPORTANT: These suggestions are PURELY suggestions and should be taken with a grain of salt UNLESS they are directly related to the implementation plan and marked as IMPORTANT/HIGHLY RECOMMENDED.

Format each issue as:
- [LEVEL] Brief description: Specific fix recommendation

Focus on the actual changes made, not the entire file. Be direct and actionable.

IMPLEMENTATION PLAN:
{{IMPLEMENTATION_PLAN}}

{{REVIEW_FOCUS}}

Files to review:
{{FILES_TO_REVIEW}}`;

/**
 * Tools allowed for CodeReviewer
 * Focused on code analysis and web search for documentation
 */
const CODE_REVIEWER_ALLOWED_TOOLS = ["Read", "Glob", "Grep", "LS", "Bash", "Task", "WebFetch", "Batch", "TodoRead", "TodoWrite", "WebSearch"];

/**
 * Code Reviewer tool that uses Claude to analyze code and provide concise, actionable feedback
 */
export const codeReviewerTool = {
  name: "CodeReviewer",
  description: "Comprehensive code review tool that validates implementations against plans. Claude runs checks (TypeScript, git diff), verifies documentation compliance via WebSearch, and provides prioritized feedback on completeness, quality, security, and best practices.",
  inputSchema: {
    type: "object",
    properties: {
      filePaths: {
        type: "array",
        items: {
          type: "string"
        },
        description: "Array of paths to the files to review"
      },
      implementationPlan: {
        type: "string",
        description: "Original implementation plan for comparison"
      },
      reviewFocus: {
        type: "string",
        description: "Specific aspects to focus on during review (optional)"
      },
      timeout: {
        type: "number",
        description: "Maximum execution time in milliseconds (optional, default: 900000)"
      }
    },
    required: ["filePaths", "implementationPlan"]
  },
  handler: async (args) => {
    try {
      console.error("CodeReviewer handler called with args:", JSON.stringify(args));
      
      // Get user directory from environment variable at runtime
      const userDirectory = process.env.CC_USER_DIRECTORY || process.cwd();
      console.error('CodeReviewer userDirectory:', userDirectory);
      console.error('process.env.CC_USER_DIRECTORY:', process.env.CC_USER_DIRECTORY);
      
      // Parse inputs - handle string inputs from SSE
      let filePaths = args.filePaths;
      
      // If filePaths is a string, try to parse it as JSON
      if (typeof filePaths === 'string') {
        try {
          // First try to parse as-is
          filePaths = JSON.parse(filePaths);
        } catch (parseError) {
          try {
            // If that fails, try to fix common escaping issues
            // Replace single backslashes with double backslashes before parsing
            const fixedString = filePaths.replace(/\\(?!["\\/bfnrt])/g, '\\\\');
            filePaths = JSON.parse(fixedString);
          } catch (secondError) {
            console.error("Failed to parse filePaths string:", parseError);
            console.error("Also failed with escaped backslashes:", secondError);
            throw new Error("Invalid filePaths format - expected array or valid JSON array string");
          }
        }
      }
      
      const implementationPlan = args.implementationPlan;
      const reviewFocus = args.reviewFocus || "";
      const timeout = args.timeout || 900000;
      
      if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0 || !implementationPlan) {
        throw new Error("Both filePaths (non-empty array) and implementationPlan must be provided");
      }
      
      // Clean up file paths before formatting
      const cleanedFilePaths = filePaths.map(filePath => {
        // Only handle escaped backslashes, don't remove directory names
        return filePath.replace(/\\\\/g, '/').replace(/\\/g, '/');
      });
      
      // Format file paths to Claude Code format
      const formattedFilePaths = formatClaudeCodePaths(cleanedFilePaths);
      
      
      // Format review focus section if provided
      const reviewFocusSection = reviewFocus ? 
        `REVIEW FOCUS:\n${reviewFocus}\n` : 
        "";
      
      // Format the list of files to review with numbered sections, using Claude Code format
      const filesListFormatted = formattedFilePaths.map((path, index) => {
        return `FILE ${index + 1}: ${path}`;
      }).join('\n\n');
      
      // Format the prompt with the file paths, implementation plan, and review focus
      let formattedPrompt = CODE_REVIEWER_PROMPT
        .replace("{{FILES_TO_REVIEW}}", filesListFormatted)
        .replace("{{IMPLEMENTATION_PLAN}}", implementationPlan)
        .replace("{{REVIEW_FOCUS}}", reviewFocusSection);
      
      console.error("All information collected. Preparing prompt for Claude...");
      
      // Now execute the actual code review using Claude
      console.error("Executing CodeReviewer analysis with Claude...");
      
      const result = await executeClaudeCli({
        prompt: formattedPrompt,
        allowedTools: CODE_REVIEWER_ALLOWED_TOOLS,
        timeout: timeout,
        logPrefix: "code-reviewer"
      });
      
      console.error("CodeReviewer execution completed");
      
      // If the result has an explicit isError flag at the tool level, handle it
      if (result.isError) {
        return {
          content: result.content,
          isError: true
        };
      }
      
      // Return Claude's analysis directly
      return {
        content: result.content,
        isError: false
      };
    } catch (error) {
      console.error("Error in codeReviewerTool handler:", error);
      
      // Enhanced error handling for multiple files
      const errorMessage = error.message || String(error);
      let detailedError = `Error reviewing files: ${errorMessage}`;
      
      // If there's a specific file-related error, try to identify which file
      if (cleanedFilePaths && Array.isArray(cleanedFilePaths)) {
        for (const filePath of cleanedFilePaths) {
          if (errorMessage.includes(filePath)) {
            detailedError = `Error in file ${filePath}: ${errorMessage}`;
            break;
          }
        }
      }
      
      return {
        content: [
          {
            type: "text",
            text: detailedError
          }
        ],
        isError: true
      };
    }
  }
};