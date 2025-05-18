/**
 * utils/claude-cli.js
 * Common utilities for executing Claude CLI commands with proper environment setup
 */
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";

/**
 * Check if running in WSL
 * @returns {boolean} True if running in WSL, false otherwise
 */
export function checkIfRunningInWsl() {
  // Method 1: Check platform and environment variables
  if (process.platform === 'linux' && (process.env.WSL_DISTRO_NAME || process.env.WSLENV)) {
    return true;
  }
  
  // Method 2: Check /proc/version file
  try {
    if (fs.existsSync('/proc/version')) {
      const procVersion = fs.readFileSync('/proc/version', 'utf8');
      if (procVersion.toLowerCase().includes('microsoft')) {
        return true;
      }
    }
  } catch (error) {
    console.error(`Error checking /proc/version: ${error.message}`);
  }
  
  // Method 3: Try direct WSL-specific paths
  try {
    if (fs.existsSync('/mnt/c') || fs.existsSync('/mnt/c/Windows')) {
      return true;
    }
  } catch (error) {
    console.error(`Error checking WSL paths: ${error.message}`);
  }
  
  // Assume not WSL if all checks fail
  return false;
}

/**
 * Execute Claude CLI with proper environment setup
 * @param {Object} options - Options for executing Claude CLI
 * @param {string} options.prompt - Prompt to send to Claude
 * @param {string} options.command - Direct command to pass to Claude CLI
 * @param {string[]} options.allowedTools - List of tools Claude is allowed to use
 * @param {number} options.timeout - Execution timeout in milliseconds
 * @param {string} options.logPrefix - Prefix for log files
 * @returns {Promise<Object>} Result of Claude execution
 */
export async function executeClaudeCli({ prompt, command, allowedTools = [], timeout = 900000, logPrefix = "claude-code" }) {
  try {
    console.error(`Executing Claude CLI with ${prompt ? "prompt" : "command"}, allowed tools: ${allowedTools.join(", ")}`);
    
    // Check if we're already in WSL
    const isWsl = checkIfRunningInWsl();
    console.error(`Running in WSL: ${isWsl}`);
    
    // Get working directory - using the same as in the user terminal
    const userDirectory = process.env.CC_USER_DIRECTORY || "/path/to/project/directory";
    console.error(`Using user directory: ${userDirectory}`);
    
    const claudePath = process.env.CLAUDE_EXECUTABLE_PATH || "/path/to/claude/executable";
    console.error(`Using Claude CLI at: ${claudePath}`);
    
    // Create a temp directory for logs if needed
    const tempDir = path.join(os.tmpdir(), "claude-code-mcp");
    try {
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
    } catch (error) {
      console.error(`Error creating temp directory: ${error.message}`);
    }
    
    // Write a log file for debugging
    const logFile = path.join(tempDir, `${logPrefix}-${Date.now()}.log`);
    try {
      fs.writeFileSync(logFile, `Starting Claude Code execution at ${new Date().toISOString()}\n`);
      fs.appendFileSync(logFile, `WSL: ${isWsl}\n`);
      fs.appendFileSync(logFile, `User directory: ${userDirectory}\n`);
      fs.appendFileSync(logFile, `Claude path: ${claudePath}\n`);
      fs.appendFileSync(logFile, `Allowed tools: ${allowedTools.join(", ")}\n`);
    } catch (error) {
      console.error(`Error writing log file: ${error.message}`);
    }
    
    // Build the command
    let bashCommand;
    if (prompt) {
      const toolsString = allowedTools.join(",");
      
      // Use base64 encoding to avoid all escaping issues
      const base64Prompt = Buffer.from(prompt).toString('base64');
      
      // Pass the prompt via stdin by piping directly through base64 decode
      bashCommand = `export PATH="/path/to/node/bin:$PATH" && cd "${userDirectory}" && echo "${base64Prompt}" | base64 -d | ${claudePath} -p /dev/stdin --allowedTools "${toolsString}"`;
    } else if (command) {
      // Set PATH, cd to directory, and run claude with custom command
      bashCommand = `export PATH="/path/to/node/bin:$PATH" && cd "${userDirectory}" && ${claudePath} ${command}`;
    } else {
      throw new Error("Either prompt or command must be provided");
    }
    
    console.error(`Executing command: ${bashCommand}`);
    
    // Log the command
    try {
      fs.appendFileSync(logFile, `Command: ${bashCommand}\n`);
    } catch (error) {
      console.error(`Error appending to log file: ${error.message}`);
    }
    
    // Execute the command directly (we're already in WSL)
    console.error(`Executing bash command directly since we're in WSL`);
    const childProcess = spawn("bash", ["-c", bashCommand], {
      stdio: ["ignore", "pipe", "pipe"]
    });
    
    let stdout = "";
    let stderr = "";
    
    childProcess.stdout.on("data", (data) => {
      const chunk = data.toString();
      stdout += chunk;
      console.error(`[STDOUT]: ${chunk.trim()}`);
      
      // Log stdout
      try {
        fs.appendFileSync(logFile, `[STDOUT]: ${chunk}`);
      } catch (error) {
        console.error(`Error logging stdout: ${error.message}`);
      }
    });
    
    childProcess.stderr.on("data", (data) => {
      const chunk = data.toString();
      stderr += chunk;
      console.error(`[STDERR]: ${chunk.trim()}`);
      
      // Log stderr
      try {
        fs.appendFileSync(logFile, `[STDERR]: ${chunk}`);
      } catch (error) {
        console.error(`Error logging stderr: ${error.message}`);
      }
    });
    
    // Create execution promise
    const executePromise = new Promise((resolve) => {
      childProcess.on("close", (code) => {
        console.error(`Process exited with code ${code}`);
        
        // Log process exit
        try {
          fs.appendFileSync(logFile, `Process exited with code ${code}\n`);
        } catch (error) {
          console.error(`Error logging process exit: ${error.message}`);
        }
        
        resolve({
          stdout,
          stderr,
          exitCode: code || 0,
          error: code !== 0 ? `Process exited with code ${code}` : null
        });
      });
      
      childProcess.on("error", (error) => {
        console.error(`Process error: ${error.message}`);
        
        // Log process error
        try {
          fs.appendFileSync(logFile, `Process error: ${error.message}\n`);
        } catch (logError) {
          console.error(`Error logging process error: ${logError.message}`);
        }
        
        resolve({
          stdout,
          stderr: stderr + "\n" + error.message,
          exitCode: 1,
          error: `Failed to execute command: ${error.message}`
        });
      });
    });
    
    // Add timeout handling
    const timeoutPromise = new Promise((resolve) => {
      const timer = setTimeout(() => {
        console.error(`Command execution timed out after ${timeout}ms`);
        
        // Log timeout
        try {
          fs.appendFileSync(logFile, `Command execution timed out after ${timeout}ms\n`);
        } catch (error) {
          console.error(`Error logging timeout: ${error.message}`);
        }
        
        if (childProcess) {
          console.error("Attempting to terminate process...");
          childProcess.kill("SIGTERM");
          
          // Force kill if needed
          setTimeout(() => {
            if (childProcess && !childProcess.killed) {
              console.error("Forcing process termination with SIGKILL...");
              childProcess.kill("SIGKILL");
            }
          }, 3000);
        }
        
        resolve({
          stdout: "",
          stderr: "Command execution timed out.",
          exitCode: 0,
          error: `Command timed out after ${timeout}ms`
        });
      }, timeout);
      
      // Clear the timeout if execute promise resolves first
      executePromise.then(() => clearTimeout(timer));
    });
    
    // Race between execution and timeout
    const result = await Promise.race([executePromise, timeoutPromise]);
    
    // Format and return the result
    if (result.error) {
      console.error(`Command failed: ${result.error}`);
      
      // Log command failure
      try {
        fs.appendFileSync(logFile, `Command failed: ${result.error}\n`);
      } catch (error) {
        console.error(`Error logging command failure: ${error.message}`);
      }
      
      return {
        content: [
          {
            type: "text",
            text: `Error executing Claude Code: ${result.error}\n\n${result.stderr}`
          }
        ],
        isError: true
      };
    } else {
      console.error("Command completed successfully");
      
      // Log command success
      try {
        fs.appendFileSync(logFile, `Command completed successfully\n`);
      } catch (error) {
        console.error(`Error logging command success: ${error.message}`);
      }
      
      // Check if stdout is empty
      if (!result.stdout.trim()) {
        console.error("Command succeeded but produced no output");
        try {
          fs.appendFileSync(logFile, `Warning: Command produced no output\n`);
        } catch (error) {
          console.error(`Error logging empty output warning: ${error.message}`);
        }
        
        // For code editor tool, we want to pass through empty output as Claude likely made edits
        // without providing a response message - this is normal behavior
        if (logPrefix === "code-editor") {
          console.error("Empty output from code-editor tool - this is likely normal as Claude made edits silently");
          return {
            content: [
              {
                type: "text",
                text: "(no content)\n"
              }
            ],
            isError: false,
            metadata: {
              exitCode: result.exitCode,
              sessionId: randomUUID()
            }
          };
        }
        
        // Return a fallback message for empty output for other tools
        return {
          content: [
            {
              type: "text",
              text: "The query was processed but no results were returned. Please try again with more specific details or as a new query instead of a follow-up."
            }
          ],
          isError: false,
          metadata: {
            exitCode: result.exitCode,
            sessionId: randomUUID(),
            emptyOutput: true
          }
        };
      }
      
      return {
        content: [
          {
            type: "text",
            text: result.stdout
          }
        ],
        isError: false,
        metadata: {
          exitCode: result.exitCode,
          sessionId: randomUUID()
        }
      };
    }
  } catch (error) {
    console.error("Error in executeClaudeCli:", error);
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