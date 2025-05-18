const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// Add CORS support
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, MCP-Session-Id');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Create a unified OAuth discovery response that includes both services
app.get('/.well-known/oauth-authorization-server', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.json({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/oauth/authorize`,
    token_endpoint: `${baseUrl}/oauth/token`,
    registration_endpoint: `${baseUrl}/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
    services: {
      'claude-code': `${baseUrl}/claude-code`,
      'sequential-thinking': `${baseUrl}/sequential-thinking`
    }
  });
});

// Create a unified MCP discovery response
app.get('/.well-known/mcp', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.json({
    services: [
      {
        name: "ClaudeCode",
        version: "1.2.0",
        transport: "sse",
        endpoints: {
          sse: "/claude-code/sse",
          messages: "/claude-code/messages"
        },
        oauth: {
          discovery: "/.well-known/oauth-authorization-server"
        }
      },
      {
        name: "SequentialThinking",
        version: "1.0.0",
        transport: "sse",
        endpoints: {
          sse: "/sequential-thinking/sse",
          messages: "/sequential-thinking/messages"
        },
        oauth: {
          discovery: "/.well-known/oauth-authorization-server"
        }
      }
    ]
  });
});

// Create proxy middleware instances for OAuth endpoints
const oauthProxy = createProxyMiddleware({
  target: 'http://localhost:3000',  // Forward to Claude Code service for OAuth
  changeOrigin: true
});

// Forward OAuth registration to Claude Code service
app.post('/register', oauthProxy);

// Forward OAuth authorization to Claude Code service
app.get('/oauth/authorize', oauthProxy);

// Forward OAuth token endpoint to Claude Code service
app.post('/oauth/token', oauthProxy);

// Add middleware to log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, {
    query: req.query,
    headers: {
      'mcp-session-id': req.headers['mcp-session-id'],
      'content-type': req.headers['content-type']
    }
  });
  next();
});

// Proxy configuration for Claude Code MCP
app.use('/claude-code', createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true,
  pathRewrite: {
    '^/claude-code': ''
  },
  ws: true,
  onProxyReq: (proxyReq, req, res) => {
    // Preserve headers for SSE
    proxyReq.setHeader('Connection', 'keep-alive');
    proxyReq.setHeader('Cache-Control', 'no-cache');
    // Pass the original URL so the backend knows it's being proxied
    proxyReq.setHeader('X-Original-URL', req.originalUrl);
  }
}));

// Proxy configuration for Sequential Thinking MCP
app.use('/sequential-thinking', createProxyMiddleware({
  target: 'http://localhost:3001',
  changeOrigin: true,
  pathRewrite: {
    '^/sequential-thinking': ''
  },
  ws: true,
  onProxyReq: (proxyReq, req, res) => {
    // Preserve headers for SSE
    proxyReq.setHeader('Connection', 'keep-alive');
    proxyReq.setHeader('Cache-Control', 'no-cache');
    // Pass the original URL so the backend knows it's being proxied
    proxyReq.setHeader('X-Original-URL', req.originalUrl);
  }
}));

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
  console.log('');
  console.log('Routes:');
  console.log(`- http://localhost:${PORT}/claude-code/* -> http://localhost:3000/*`);
  console.log(`- http://localhost:${PORT}/sequential-thinking/* -> http://localhost:3001/*`);
  console.log('');
  console.log('Root-level OAuth endpoints:');
  console.log(`- /.well-known/oauth-authorization-server`);
  console.log(`- /.well-known/mcp`);
  console.log(`- /register`);
  console.log(`- /oauth/authorize`);
  console.log(`- /oauth/token`);
  console.log('');
  console.log('Service endpoints:');
  console.log('- /claude-code/sse');
  console.log('- /claude-code/messages');
  console.log('- /sequential-thinking/sse');
  console.log('- /sequential-thinking/messages');
  console.log('');
  console.log('Use these paths with ngrok:');
  console.log('- [ngrok-url]/.well-known/oauth-authorization-server');
  console.log('- [ngrok-url]/claude-code/sse');
  console.log('- [ngrok-url]/sequential-thinking/sse');
});