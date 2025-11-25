#!/usr/bin/env node

const http = require('http');
const { spawn } = require('child_process');

const ZETHCHAIND_PATH = process.env.ZETHCHAIND_PATH || `${process.env.HOME}/go/bin/zethchaind`;
const PORT = process.env.FAUCET_PORT ? parseInt(process.env.FAUCET_PORT, 10) : 4500;
const RPC = process.env.FAUCET_RPC || 'http://localhost:26657';
const CHAIN_ID = process.env.FAUCET_CHAIN_ID || 'zethchain';
const GAS_PRICES = process.env.FAUCET_GAS_PRICES || '0.025uzeth';
const GAS_ADJUSTMENT = process.env.FAUCET_GAS_ADJUSTMENT || '1.3';
const SENDER = process.env.FAUCET_SENDER || 'bob';

function json(res, statusCode, obj) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(obj));
}

function runSend(address, coin) {
  return new Promise((resolve) => {
    const args = [
      'tx', 'bank', 'send', SENDER, address, coin,
      '--chain-id', CHAIN_ID,
      '--node', RPC,
      '--yes',
      '--keyring-backend', 'test',
      '--broadcast-mode', 'block',
      '--gas', 'auto',
      '--gas-adjustment', GAS_ADJUSTMENT,
      '--gas-prices', GAS_PRICES
    ];

    let proc;
    try {
      proc = spawn(ZETHCHAIND_PATH, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) {
      return resolve({ code: 127, stdout: '', stderr: String(e) });
    }
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('error', (err) => {
      resolve({ code: 127, stdout: stdout, stderr: String(err) });
    });
    proc.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  if (req.method === 'GET' && req.url === '/health') {
    return json(res, 200, { ok: true });
  }

  if (req.method === 'GET' && req.url === '/') {
    // Simple info page
    res.writeHead(200, { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' });
    return res.end('<html><body><h1>ZETH Faucet</h1><p>POST / with {"address":"zeth1...","coins":["10000000uzeth"]}</p></body></html>');
  }

  if (req.method === 'POST' && req.url === '/') {
    let body = '';
    req.on('data', (chunk) => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        const address = data.address;
        const coins = Array.isArray(data.coins) ? data.coins : [];
        if (!address || !address.startsWith('zeth1')) {
          return json(res, 400, { error: 'invalid address, must start with zeth1' });
        }
        if (!coins.length) {
          return json(res, 400, { error: 'coins is required, e.g. ["10000000uzeth"]' });
        }
        const results = [];
        for (const coin of coins) {
          if (typeof coin !== 'string' || !coin.endsWith('uzeth')) {
            results.push({ coin, error: 'invalid coin denom, only uzeth supported' });
            continue;
          }
          const r = await runSend(address, coin);
          results.push({ coin, code: r.code, stdout: r.stdout, stderr: r.stderr });
        }
        return json(res, 200, { results });
      } catch (e) {
        return json(res, 500, { error: e.message || String(e) });
      }
    });
    return;
  }

  return json(res, 404, { error: 'not found' });
});

server.listen(PORT, () => {
  console.log(`ZETH Faucet listening on http://localhost:${PORT}`);
  console.log(`Sender: ${SENDER}, RPC: ${RPC}, CHAIN_ID: ${CHAIN_ID}, GAS_PRICES: ${GAS_PRICES}`);
});