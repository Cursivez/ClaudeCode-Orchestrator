#!/usr/bin/env node

/**
 * SSE MCP Server for Sequential Thinking Tools
 * Includes OAuth endpoints for Claude.ai integration
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { SEQUENTIAL_THINKING_TOOL } from './dist/schema.js';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(
  readFileSync(join(__dirname, 'package.json'), 'utf8'),
);
const { name, version } = pkg;

// Store transports and auth data
const transports = new Map();
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
    const new_refresh_token = crypto.randomBytes(32).toString('hex');
    
    accessTokens.set(access_token, {
      client_id,
      expires: Date.now() + 3600000 // 1 hour
    });
    
    authCodes.delete(code);
    
    res.json({
      access_token,
      refresh_token: new_refresh_token,
      token_type: 'Bearer',
      expires_in: 3600
    });
  } else if (grant_type === 'refresh_token') {
    const access_token = crypto.randomBytes(32).toString('hex');
    const new_refresh_token = crypto.randomBytes(32).toString('hex');
    
    accessTokens.set(access_token, {
      client_id,
      expires: Date.now() + 3600000
    });
    
    res.json({
      access_token,
      refresh_token: new_refresh_token,
      token_type: 'Bearer',
      expires_in: 3600
    });
  } else {
    res.status(400).json({ error: 'unsupported_grant_type' });
  }
});

// SSE endpoint for MCP messages - handle both direct and proxied access
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
    
    if (originalUrl.includes('/sequential-thinking/') || referer.includes('/sequential-thinking/')) {
      messagesPath = '/sequential-thinking/messages';
    }
    
    console.log('Using messages path:', messagesPath);
    
    // Create transport with the appropriate path
    const transport = new SSEServerTransport(messagesPath, res);
    const sessionId = transport.sessionId;
    transports.set(sessionId, transport);
    
    // Cleanup on disconnect
    res.on('close', () => {
      console.log(`SSE transport closed for session ${sessionId}`);
      transports.delete(sessionId);
    });
    
    // Create a new server instance and connect transport
    const server = new McpServer(
      { name, version },
      { capabilities: { tools: {} } }
    );
    
    const sequentialThinkingServer = new SequentialThinkingServer();
    
    // Register the sequential thinking tool
    server.tool(
      SEQUENTIAL_THINKING_TOOL.name,
      SEQUENTIAL_THINKING_TOOL.description,
      {
        thought: z.string().describe('Your current thinking step'),
        next_thought_needed: z.boolean().describe('Whether another thought step is needed'),
        thought_number: z.number().min(1).describe('Current thought number'),
        total_thoughts: z.number().min(1).describe('Estimated total thoughts needed'),
        is_revision: z.boolean().optional().describe('Whether this revises previous thinking'),
        revises_thought: z.number().min(1).optional().describe('Which thought is being reconsidered'),
        branch_from_thought: z.number().min(1).optional().describe('Branching point thought number'),
        branch_id: z.string().optional().describe('Branch identifier'),
        needs_more_thoughts: z.boolean().optional().describe('If more thoughts are needed'),
        current_step: z.object({
          step_description: z.string().describe('What needs to be done'),
          recommended_tools: z.array(z.object({
            tool_name: z.string().describe('Name of the tool being recommended'),
            confidence: z.number().min(0).max(1).describe('0-1 indicating confidence in recommendation'),
            rationale: z.string().describe('Why this tool is recommended'),
            priority: z.number().describe('Order in the recommendation sequence'),
            suggested_inputs: z.object({}).passthrough().optional().describe('Optional suggested parameters'),
            alternatives: z.array(z.string()).optional().describe('Alternative tools that could be used')
          })).describe('Tools recommended for this step'),
          expected_outcome: z.string().describe('What to expect from this step'),
          next_step_conditions: z.array(z.string()).optional().describe('Conditions to consider for the next step')
        }).optional().describe('Current step recommendation'),
        previous_steps: z.array(z.object({
          step_description: z.string().describe('What needs to be done'),
          recommended_tools: z.array(z.object({
            tool_name: z.string().describe('Name of the tool being recommended'),
            confidence: z.number().min(0).max(1).describe('0-1 indicating confidence in recommendation'),
            rationale: z.string().describe('Why this tool is recommended'),
            priority: z.number().describe('Order in the recommendation sequence'),
            suggested_inputs: z.object({}).passthrough().optional().describe('Optional suggested parameters'),
            alternatives: z.array(z.string()).optional().describe('Alternative tools that could be used')
          })).describe('Tools recommended for this step'),
          expected_outcome: z.string().describe('What to expect from this step'),
          next_step_conditions: z.array(z.string()).optional().describe('Conditions to consider for the next step')
        })).optional().describe('Steps already recommended'),
        remaining_steps: z.array(z.string()).optional().describe('High-level descriptions of upcoming steps')
      },
      async (args) => {
        console.log(`Tool ${SEQUENTIAL_THINKING_TOOL.name} called with args:`, args);
        return sequentialThinkingServer.processThought(args);
      }
    );
    
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
  
  const transport = transports.get(sessionId);
  
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
  res.json({ status: 'ok', version });
});

// MCP discovery endpoint
app.get('/.well-known/mcp', (req, res) => {
  res.json({
    name,
    version,
    transport: "sse",
    endpoints: {
      sse: "/sse",
      messages: "/messages"
    }
  });
});

// Sequential Thinking Server implementation
class SequentialThinkingServer {
  constructor() {
    this.thought_history = [];
    this.branches = {};
    this.available_tools = new Map();
    
    // Always include the sequential thinking tool
    this.available_tools.set(SEQUENTIAL_THINKING_TOOL.name, SEQUENTIAL_THINKING_TOOL);
  }
  
  getAvailableTools() {
    return Array.from(this.available_tools.values());
  }
  
  formatRecommendation(step) {
    const tools = step.recommended_tools
      .map((tool) => {
        const alternatives = tool.alternatives?.length 
          ? ` (alternatives: ${tool.alternatives.join(', ')})`
          : '';
        const inputs = tool.suggested_inputs 
          ? `\n    Suggested inputs: ${JSON.stringify(tool.suggested_inputs)}`
          : '';
        return `  - ${tool.tool_name} (priority: ${tool.priority})${alternatives}
    Rationale: ${tool.rationale}${inputs}`;
      })
      .join('\n');

    return `Step: ${step.step_description}
Recommended Tools:
${tools}
Expected Outcome: ${step.expected_outcome}${
      step.next_step_conditions
        ? `\nConditions for next step:\n  - ${step.next_step_conditions.join('\n  - ')}`
        : ''
    }`;
  }
  
  formatThought(thoughtData) {
    const {
      thought_number,
      total_thoughts,
      thought,
      is_revision,
      revises_thought,
      branch_from_thought,
      branch_id,
      current_step,
    } = thoughtData;

    let prefix = '';
    let context = '';

    if (is_revision) {
      prefix = chalk.yellow('🔄 Revision');
      context = ` (revising thought ${revises_thought})`;
    } else if (branch_from_thought) {
      prefix = chalk.green('🌿 Branch');
      context = ` (from thought ${branch_from_thought}, ID: ${branch_id})`;
    } else {
      prefix = chalk.blue('💭 Thought');
      context = '';
    }

    const header = `${prefix} ${thought_number}/${total_thoughts}${context}`;
    let content = thought;

    // Add recommendation information if present
    if (current_step) {
      content = `${thought}\n\nRecommendation:\n${this.formatRecommendation(current_step)}`;
    }

    const border = '─'.repeat(
      Math.max(header.length, content.length) + 4,
    );

    return `
┌${border}┐
│ ${header} │
├${border}┤
│ ${content.padEnd(border.length - 2)} │
└${border}┘`;
  }
  
  async processThought(input) {
    try {
      const validatedInput = this.validateThoughtData(input);
      
      if (validatedInput.thought_number > validatedInput.total_thoughts) {
        validatedInput.total_thoughts = validatedInput.thought_number;
      }
      
      // Store the current step in thought history
      if (validatedInput.current_step) {
        if (!validatedInput.previous_steps) {
          validatedInput.previous_steps = [];
        }
        validatedInput.previous_steps.push(validatedInput.current_step);
      }
      
      this.thought_history.push(validatedInput);
      
      if (validatedInput.branch_from_thought && validatedInput.branch_id) {
        if (!this.branches[validatedInput.branch_id]) {
          this.branches[validatedInput.branch_id] = [];
        }
        this.branches[validatedInput.branch_id].push(validatedInput);
      }
      
      const formattedThought = this.formatThought(validatedInput);
      console.error(formattedThought);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                thought_number: validatedInput.thought_number,
                total_thoughts: validatedInput.total_thoughts,
                next_thought_needed: validatedInput.next_thought_needed,
                branches: Object.keys(this.branches),
                thought_history_length: this.thought_history.length,
                current_step: validatedInput.current_step,
                previous_steps: validatedInput.previous_steps,
                remaining_steps: validatedInput.remaining_steps,
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: error instanceof Error ? error.message : String(error),
                status: 'failed',
              },
              null,
              2,
            ),
          },
        ],
        isError: true,
      };
    }
  }
  
  validateThoughtData(input) {
    const data = input;
    
    if (!data.thought || typeof data.thought !== 'string') {
      throw new Error('Invalid thought: must be a string');
    }
    if (!data.thought_number || typeof data.thought_number !== 'number') {
      throw new Error('Invalid thought_number: must be a number');
    }
    if (!data.total_thoughts || typeof data.total_thoughts !== 'number') {
      throw new Error('Invalid total_thoughts: must be a number');
    }
    if (typeof data.next_thought_needed !== 'boolean') {
      throw new Error('Invalid next_thought_needed: must be a boolean');
    }
    
    return {
      thought: data.thought,
      thought_number: data.thought_number,
      total_thoughts: data.total_thoughts,
      next_thought_needed: data.next_thought_needed,
      is_revision: data.is_revision,
      revises_thought: data.revises_thought,
      branch_from_thought: data.branch_from_thought,
      branch_id: data.branch_id,
      needs_more_thoughts: data.needs_more_thoughts,
      current_step: data.current_step,
      previous_steps: data.previous_steps,
      remaining_steps: data.remaining_steps,
    };
  }
}

// Configure port from environment or default to 3001
const port = process.env.PORT || 3001;

// Start server
const httpServer = app.listen(port, () => {
  console.log(`Sequential Thinking MCP SSE Server running on http://localhost:${port}`);
  console.log(`OAuth discovery: http://localhost:${port}/.well-known/oauth-authorization-server`);
  console.log(`SSE endpoint: http://localhost:${port}/sse`);
  console.log(`Messages endpoint: http://localhost:${port}/messages`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  httpServer.close(() => {
    console.log('Server closed');
  });
});