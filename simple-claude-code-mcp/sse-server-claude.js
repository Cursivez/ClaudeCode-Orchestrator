/**
 * SSE MCP Server with OAuth endpoints for Claude.ai
 * Includes the necessary endpoints that Claude.ai expects
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import cors from "cors";
import crypto from "crypto";
import { z } from "zod";

// Import all tools
import { claudeCodeTool } from "./tools/claude-code.js";
import { contextEngineTool } from "./tools/context-engine.js";
import { codeEditorTool } from "./tools/code-editor.js";
import { codeReviewerTool } from "./tools/code-reviewer.js";
import { codeFormatterTool } from "./tools/code-formatter.js";

const VERSION = "1.2.0";
const allTools = [claudeCodeTool, contextEngineTool, codeEditorTool, codeReviewerTool, codeFormatterTool];

// Set default CC_USER_DIRECTORY if not already set
if (!process.env.CC_USER_DIRECTORY) {
  // Default to project directory if not specified
  process.env.CC_USER_DIRECTORY = '/path/to/project/directory';
  console.log('CC_USER_DIRECTORY not set, defaulting to:', process.env.CC_USER_DIRECTORY);
} else {
  console.log('CC_USER_DIRECTORY is set to:', process.env.CC_USER_DIRECTORY);
}

// Store transports and auth data
const transports = {};
const authCodes = new Map();
const accessTokens = new Map();

// Initialize Express app
const app = express();

// CORS configuration for Claude.ai
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'MCP-Session-Id']
}));

app.use(express.json());

// OAuth discovery endpoint
app.get('/.well-known/oauth-authorization-server', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.json({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/oauth/authorize`,
    token_endpoint: `${baseUrl}/oauth/token`,
    registration_endpoint: `${baseUrl}/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic']
  });
});

// Client registration endpoint
app.post('/register', (req, res) => {
  const client_id = 'claude_' + crypto.randomBytes(8).toString('hex');
  const client_secret = crypto.randomBytes(32).toString('hex');
  
  res.json({
    client_id,
    client_secret,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    grant_types: ['authorization_code'],
    redirect_uris: req.body.redirect_uris || [],
    token_endpoint_auth_method: 'client_secret_post'
  });
});

// OAuth authorization endpoint
app.get('/oauth/authorize', (req, res) => {
  const { client_id, redirect_uri, state, response_type } = req.query;
  
  // Generate authorization code
  const code = crypto.randomBytes(16).toString('hex');
  authCodes.set(code, {
    client_id,
    redirect_uri,
    expires: Date.now() + 300000 // 5 minutes
  });
  
  // Redirect back with authorization code
  const redirectUrl = new URL(redirect_uri);
  redirectUrl.searchParams.set('code', code);
  redirectUrl.searchParams.set('state', state);
  
  res.redirect(redirectUrl.toString());
});

// OAuth token endpoint
app.post('/oauth/token', (req, res) => {
  const { grant_type, code, client_id, client_secret, refresh_token } = req.body;
  
  if (grant_type === 'authorization_code') {
    const authData = authCodes.get(code);
    
    if (!authData || authData.expires < Date.now()) {
      return res.status(400).json({ error: 'invalid_grant' });
    }
    
    // Generate access token
    const access_token = crypto.randomBytes(32).toString('hex');
    const refresh_token = crypto.randomBytes(32).toString('hex');
    
    accessTokens.set(access_token, {
      client_id,
      expires: Date.now() + 3600000 // 1 hour
    });
    
    authCodes.delete(code);
    
    res.json({
      access_token,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token
    });
  } else if (grant_type === 'refresh_token') {
    // Handle refresh token grant
    const access_token = crypto.randomBytes(32).toString('hex');
    
    accessTokens.set(access_token, {
      client_id,
      expires: Date.now() + 3600000
    });
    
    res.json({
      access_token,
      token_type: 'Bearer',
      expires_in: 3600
    });
  } else {
    res.status(400).json({ error: 'unsupported_grant_type' });
  }
});

// Create MCP server factory
const createMcpServer = () => {
  const server = new McpServer(
    {
      name: "ClaudeCode",
      version: VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Convert JSON Schema to Zod schemas and register tools
  allTools.forEach(tool => {
    // Create Zod schema from inputSchema
    const zodSchema = {};
    
    for (const [key, prop] of Object.entries(tool.inputSchema.properties || {})) {
      let schema;
      
      switch (prop.type) {
        case 'string':
          schema = z.string();
          if (prop.enum) {
            schema = z.enum(prop.enum);
          }
          break;
        case 'number':
          schema = z.number();
          break;
        case 'boolean':
          schema = z.boolean();
          break;
        default:
          schema = z.any();
      }
      
      // Add description
      if (prop.description) {
        schema = schema.describe(prop.description);
      }
      
      // Check if required
      if (!tool.inputSchema.required || !tool.inputSchema.required.includes(key)) {
        schema = schema.optional();
      }
      
      zodSchema[key] = schema;
    }
    
    server.tool(
      tool.name,
      tool.description,
      zodSchema,
      async (args) => {
        console.log(`Tool ${tool.name} called with args:`, args);
        return tool.handler(args);
      }
    );
  });

  return server;
};

// Main SSE endpoint (with optional auth check) - handle both direct and proxied access
app.get('/sse', async (req, res) => {
  console.log('Establishing SSE stream');
  
  // Optional: Check for auth token
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    const tokenData = accessTokens.get(token);
    
    if (!tokenData || tokenData.expires < Date.now()) {
      console.log('Invalid or expired token');
      // Continue anyway for testing, but log the issue
    }
  }
  
  try {
    // Determine the correct messages path based on how we're being accessed
    let messagesPath = '/messages';
    
    // Check if we're being accessed through a proxy with a path prefix
    const originalUrl = req.headers['x-original-url'] || req.originalUrl || req.url;
    const referer = req.headers.referer || '';
    
    if (originalUrl.includes('/claude-code/') || referer.includes('/claude-code/')) {
      messagesPath = '/claude-code/messages';
    }
    
    console.log('Using messages path:', messagesPath);
    
    // Create transport with the appropriate path
    const transport = new SSEServerTransport(messagesPath, res);
    const sessionId = transport.sessionId;
    transports[sessionId] = transport;
    
    // Cleanup on disconnect
    res.on('close', () => {
      console.log(`SSE transport closed for session ${sessionId}`);
      delete transports[sessionId];
    });
    
    // Create a new server instance and connect transport
    const server = createMcpServer();
    await server.connect(transport);
    
    console.log(`Established SSE stream with session ID: ${sessionId}`);
  } catch (error) {
    console.error('Error establishing SSE stream:', error);
    res.status(500).end();
  }
});

// Messages endpoint
app.post('/messages', async (req, res) => {
  const sessionId = req.query.sessionId;
  
  if (!sessionId) {
    console.error('Messages endpoint called without session ID', { 
      headers: req.headers,
      query: req.query 
    });
    return res.status(400).json({ error: 'Session ID required' });
  }
  
  const transport = transports[sessionId];
  
  if (!transport) {
    console.error(`No transport found for session ID: ${sessionId}`);
    return res.status(404).json({ error: 'Session not found' });
  }
  
  try {
    // Handle the POST message with the transport
    await transport.handlePostMessage(req, res, req.body);
  } catch (error) {
    console.error('Error handling message:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: VERSION });
});

// MCP discovery endpoint
app.get('/.well-known/mcp', (req, res) => {
  res.json({
    name: "ClaudeCode",
    version: VERSION,
    transport: "sse",
    endpoints: {
      sse: "/sse",
      messages: "/messages"
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;
const httpServer = app.listen(PORT, () => {
  console.log(`Claude.ai Compatible SSE MCP Server running on http://localhost:${PORT}`);
  console.log(`OAuth discovery: http://localhost:${PORT}/.well-known/oauth-authorization-server`);
  console.log(`SSE endpoint: http://localhost:${PORT}/sse`);
  console.log(`Messages endpoint: http://localhost:${PORT}/messages`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    console.log('Server closed');
  });
});