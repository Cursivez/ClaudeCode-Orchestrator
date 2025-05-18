/**
 * tools/context-engine.js
 * Code search and retrieval tool for providing accurate context from a codebase
 */
import { executeClaudeCli } from "../utils/claude-cli.js";
import { formatClaudeCodePath, formatPathsInText } from "../utils/path-formatter.js";

// ContextEngine prompt template
const CONTEXT_ENGINE_PROMPT = `You are a codebase search tool that retrieves and presents exact code matches from files. Your primary function is accurate information retrieval without inference or assumptions.
IMPORTANT: Your job is STRICTLY to find and report actual code that exists in files. Present ONLY what you directly observe in the codebase. Do not include assumptions, thinking, or theories—only the facts.
CRITICAL: Always produce responses with a consistent, predictable structure and BE CONCISE. Avoid verbose analysis and focus on critical information only.
Follow these steps:
1. Analyze the user's query precisely:
   - Identify exact keywords, file names, class names, and function names to search for
   - Look for literal code patterns rather than concepts
   - Focus on concrete entity names rather than abstract concepts
   - DO NOT infer technical concepts not explicitly mentioned
2. Select the optimal search strategy:
   - For 'hybrid' mode (default): Use exact text searches combined with pattern matching
   - For 'keyword' mode: Use precise pattern matching focusing on exact terms only
   - For 'semantic' mode: Focus on textual similarity and naming patterns
   CRITICAL: Always respect the search filters provided in <search_filters> tags:
   - file_type: Target specific file extensions (e.g., "tsx", "js", "py")
   - directory: Limit search to specified directories
   - max_results: Respect result count limitations
   - search_mode: Apply the specified search approach
   - include_dependencies: When true, analyze and include dependency relationships
3. Execute a precise, evidence-based search:
   - Use direct text matching for exact component/class/interface names
   - For imports, search for the exact text "import X from" where X is the entity name
   - Verify each search result exists in the file before reporting it
   - NEVER report files or code that don't actually exist
   - Confirm all relationships between components with direct evidence
4. Handle case sensitivity and path variations:
   - If exact matches fail, try case-insensitive searches
   - Check both kebab-case and camelCase variations (e.g., "data-service" vs "dataService")
   - ONLY report files that actually exist in the filesystem
   - Use the exact file paths from the repository
5. Analyze code with strict evidence requirements:
   - ONLY extract functions, classes, and interfaces that are literally present in the code
   - ONLY report imports/exports that are explicitly declared in the file
   - ONLY identify relationships that are explicitly defined, not inferred
   - Do not invent or synthesize relationships between components without evidence
6. Present results with a CONSISTENT STRUCTURE and CONCISE ANALYSIS:
   - Every response must follow the EXACT same format
   - Minimize unnecessary explanations - focus on facts only
   - Use the exact file paths as they appear in the repository
   - Include complete code snippets with proper indentation preserved
   - Show accurate line numbers for precise referencing
   - Only include directly observed code, never synthesized examples
   - ALWAYS format file paths in Claude Code format: @filepath or @directory/filepath
   REQUIRED RESPONSE STRUCTURE:
   \`\`\`
   [Optional metadata section - keep to 1-2 lines maximum]
   
   ## File: @[exact_file_path]
   
   \`\`\`[language]
   [code snippet with proper indentation]
   \`\`\`
   
   ### Analysis
   - **Purpose**: [1-2 line description of what this code does]
   - **Relationships**: [Only key imports, exports, usage patterns - max 3 bullet points]
   
   [Repeat for each relevant file]
   
   ## Cross-File Relationships
   - [Only include if multiple files are returned]
   - [List key relationships between files - max 3-5 bullet points]
   \`\`\`
7. Handle missing results honestly:
   - If no matches are found, state this clearly without speculation
   - DO NOT provide "best guesses" if exact matches aren't found
   - DO NOT suggest theoretical implementations
   - Simply report: "No code found matching the query criteria"
   - NEVER synthesize code that doesn't exist in the codebase
8. Apply strict verification for all results:
   - Verify all file paths exist before reporting them
   - Verify imports by confirming the exact import statement text exists
   - Verify class/interface definitions by finding exact declaration patterns
   - Verify component usage by finding actual instances in the code
   - Reject low-confidence matches (below 0.7 confidence score)
9. Maintain result quality through verification:
   - ONLY include results with high confidence scores
   - NEVER include speculative content
   - Exclude results that can't be directly verified in files
   - If unsure about a relationship, exclude it rather than speculate
10. CRITICAL RESPONSE REQUIREMENTS:
    - NEVER include lengthy "thinking" sections or analysis
    - NEVER mention "high confidence" or confidence scores directly to the user
    - ALWAYS use the exact same section structure for each response
    - BE CONCISE - focus only on the most important facts
    - When in doubt, provide less information rather than risk inaccuracy
    - No preambles, no explanations of approach - just the results

USER QUERY: {{QUERY}}

<search_filters>
file_type: {{FILE_TYPE}}
directory: {{DIRECTORY}}
search_mode: {{SEARCH_MODE}}
</search_filters>`;

/**
 * Read-only tools allowed for ContextEngine
 */
const CONTEXT_ENGINE_ALLOWED_TOOLS = ["Read", "Glob", "Grep", "LS", "Task", "Batch", "TodoRead", "TodoWrite"];

/**
 * Context Engine tool for searching and retrieving code
 */
export const contextEngineTool = {
  name: "ContextEngine",
  description: "Code search and retrieval tool that provides accurate context from a codebase. Returns exact code matches with minimal inference.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query to find code in the codebase"
      },
      directory: {
        type: "string",
        description: "Specific directory to search in (optional)"
      },
      fileType: {
        type: "string",
        description: "Filter by file extension (optional, e.g., 'js', 'ts', 'py')"
      },
      searchMode: {
        type: "string",
        enum: ["keyword", "semantic", "pattern", "hybrid"],
        description: "Search mode to use (optional, default: hybrid)"
      },
      isFollowUp: {
        type: "boolean",
        description: "Whether this query is a follow-up to a previous query (optional, default: false)"
      },
      timeout: {
        type: "number",
        description: "Maximum execution time in milliseconds (optional, default: 900000)"
      }
    },
    required: ["query"]
  },
  handler: async (args) => {
    try {
      console.error("ContextEngine handler called with args:", JSON.stringify(args));
      
      // Parse inputs
      let query = args.query;
      const directory = args.directory || "";
      const fileType = args.fileType || "";
      const searchMode = args.searchMode || "hybrid";
      const isFollowUp = args.isFollowUp || false;
      const timeout = args.timeout || 900000;
      
      if (!query) {
        throw new Error("Query must be provided");
      }
      
      // Format any file paths in the query to Claude Code format
      query = formatPathsInText(query);
      
      // Handle follow-up queries using Claude's --continue flag
      if (isFollowUp) {
        console.error("Processing follow-up query using --continue");
        try {
          const result = await executeClaudeCli({
            command: `--continue -p "${query.replace(/"/g, '\\"').replace(/'/g, "'\\''")}"`,
            allowedTools: CONTEXT_ENGINE_ALLOWED_TOOLS,
            timeout,
            logPrefix: "context-engine-followup"
          });
          
          // If we get back a successful but empty result, fall back to a new query
          if (result?.metadata?.emptyOutput || 
              !result?.content?.[0]?.text || 
              result.content[0].text.trim() === '') {
            
            console.error("Follow-up query returned empty result, falling back to new query");
            
            // Format the prompt with the search parameters for new queries
            let formattedPrompt = CONTEXT_ENGINE_PROMPT
              .replace("{{QUERY}}", `(Follow-up query) ${query}`)
              .replace("{{FILE_TYPE}}", fileType)
              .replace("{{DIRECTORY}}", directory)
              .replace("{{SEARCH_MODE}}", searchMode);
            
            // Execute Claude CLI with the ContextEngine prompt
            return await executeClaudeCli({
              prompt: formattedPrompt,
              allowedTools: CONTEXT_ENGINE_ALLOWED_TOOLS,
              timeout,
              logPrefix: "context-engine-fallback"
            });
          }
          
          return result;
        } catch (error) {
          console.error("Error in follow-up query, falling back to new query:", error);
          
          // Format the prompt with the search parameters for new queries as fallback
          let formattedPrompt = CONTEXT_ENGINE_PROMPT
            .replace("{{QUERY}}", `(Follow-up query) ${query}`)
            .replace("{{FILE_TYPE}}", fileType)
            .replace("{{DIRECTORY}}", directory)
            .replace("{{SEARCH_MODE}}", searchMode);
          
          // Execute Claude CLI with the ContextEngine prompt
          return await executeClaudeCli({
            prompt: formattedPrompt,
            allowedTools: CONTEXT_ENGINE_ALLOWED_TOOLS,
            timeout,
            logPrefix: "context-engine-fallback"
          });
        }
      } else {
        // Format the prompt with the search parameters for new queries
        let formattedPrompt = CONTEXT_ENGINE_PROMPT
          .replace("{{QUERY}}", query)
          .replace("{{FILE_TYPE}}", fileType)
          .replace("{{DIRECTORY}}", directory)
          .replace("{{SEARCH_MODE}}", searchMode);
        
        // Execute Claude CLI with the ContextEngine prompt
        return await executeClaudeCli({
          prompt: formattedPrompt,
          allowedTools: CONTEXT_ENGINE_ALLOWED_TOOLS,
          timeout,
          logPrefix: "context-engine"
        });
      }
    } catch (error) {
      console.error("Error in contextEngineTool handler:", error);
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