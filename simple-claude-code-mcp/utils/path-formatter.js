/**
 * utils/path-formatter.js
 * Utility for formatting file paths in Claude Code format
 */

/**
 * Format a file path to Claude Code format (@filepath or @directory/filepath)
 * @param {string} filePath - The file path to format
 * @param {string} rootDirectory - The root directory (optional, for relative paths)
 * @returns {string} The formatted file path with @ prefix
 */
export function formatClaudeCodePath(filePath) {
  if (!filePath) {
    return '';
  }
  
  // Remove leading slash if present
  const cleanPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
  
  // If path already starts with @, return as is
  if (cleanPath.startsWith('@')) {
    return cleanPath;
  }
  
  // Add @ prefix
  return `@${cleanPath}`;
}

/**
 * Format multiple file paths to Claude Code format
 * @param {string[]} filePaths - Array of file paths to format
 * @returns {string[]} Array of formatted file paths
 */
export function formatClaudeCodePaths(filePaths) {
  if (!Array.isArray(filePaths)) {
    return [];
  }
  
  return filePaths.map(formatClaudeCodePath);
}

/**
 * Check if a path is already in Claude Code format
 * @param {string} path - The path to check
 * @returns {boolean} True if the path is in Claude Code format
 */
export function isClaudeCodePath(path) {
  return path && path.startsWith('@');
}

/**
 * Extract the actual file path from a Claude Code formatted path
 * @param {string} claudeCodePath - The Claude Code formatted path
 * @returns {string} The actual file path without @ prefix
 */
export function extractFilePath(claudeCodePath) {
  if (!claudeCodePath) {
    return '';
  }
  
  // Remove @ prefix if present
  return claudeCodePath.startsWith('@') ? claudeCodePath.substring(1) : claudeCodePath;
}

/**
 * Format paths in a text string to Claude Code format
 * @param {string} text - The text containing file paths
 * @param {string[]} knownPaths - Optional array of known paths to format
 * @returns {string} The text with paths formatted in Claude Code format
 */
export function formatPathsInText(text, knownPaths = []) {
  if (!text) {
    return '';
  }
  
  let formattedText = text;
  
  // Format known paths if provided
  knownPaths.forEach(path => {
    if (path && !isClaudeCodePath(path)) {
      const formattedPath = formatClaudeCodePath(path);
      // Replace exact matches (with word boundaries)
      const regex = new RegExp(`\\b${escapeRegExp(path)}\\b`, 'g');
      formattedText = formattedText.replace(regex, formattedPath);
    }
  });
  
  // Try to detect and format common path patterns
  // Match paths like src/components/file.js or ./path/to/file.ts
  const pathPattern = /\b(\.\/)?([a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(js|jsx|ts|tsx|py|java|cpp|c|h|go|rb|php|swift|kt|rs|vue|svelte|json|xml|yaml|yml|md|txt|css|scss|less|html)\b/g;
  
  formattedText = formattedText.replace(pathPattern, (match) => {
    // Don't format if already has @ prefix or is part of a URL
    if (match.startsWith('@') || match.includes('://')) {
      return match;
    }
    return formatClaudeCodePath(match);
  });
  
  return formattedText;
}

/**
 * Escape special regex characters in a string
 * @param {string} string - The string to escape
 * @returns {string} The escaped string
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}