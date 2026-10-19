#!/usr/bin/env node
/**
 * Stelar Autonomous CRM - Stdio Model Context Protocol (MCP) Server
 * Can be added directly to claude_desktop_config.json or any MCP host:
 * 
 * {
 *   "mcpServers": {
 *     "stelar-crm": {
 *       "command": "node",
 *       "args": ["d:/cattle/telecrm-clone/scripts/mcp_server_stdio.js"]
 *     }
 *   }
 * }
 */

const readline = require('readline');
const http = require('http');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

async function callLocalMcpApi(payload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/mcp',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(postData);
    req.end();
  });
}

rl.on('line', async (line) => {
  if (!line.trim()) return;
  try {
    const jsonReq = JSON.parse(line);
    const result = await callLocalMcpApi(jsonReq);
    console.log(JSON.stringify(result));
  } catch (err) {
    console.log(JSON.stringify({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32603, message: err.message || "Failed to process MCP request" }
    }));
  }
});
