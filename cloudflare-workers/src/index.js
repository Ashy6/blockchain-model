// Simple reverse proxy worker for ZETH chain REST/RPC/Faucet
// Routes:
// - /rest/*   -> forwards to REST_ORIGIN
// - /rpc/*    -> forwards to RPC_ORIGIN
// - /faucet/* -> forwards to FAUCET_ORIGIN
// - /health   -> checks both REST and RPC

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('origin');

    // Preflight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // Health check
    if (url.pathname === '/health') {
      try {
        const [restRes, rpcRes] = await Promise.all([
          fetch(new URL('/cosmos/base/tendermint/v1beta1/blocks/latest', env.REST_ORIGIN)),
          fetch(new URL('/status', env.RPC_ORIGIN)),
        ]);
        const ok = restRes.ok && rpcRes.ok;
        return new Response(
          JSON.stringify({ ok, rest: restRes.status, rpc: rpcRes.status }),
          { headers: addJSONCors(corsHeaders(origin)), status: ok ? 200 : 502 }
        );
      } catch (e) {
        return new Response(
          JSON.stringify({ ok: false, error: e && e.message ? e.message : String(e) }),
          { headers: addJSONCors(corsHeaders(origin)), status: 500 }
        );
      }
    }

    // REST proxy
    if (url.pathname.startsWith('/rest/')) {
      const path = url.pathname.replace('/rest', '');
      const target = new URL(path + url.search, env.REST_ORIGIN);
      const res = await forward(request, target);
      return withCors(res, origin);
    }

    // RPC proxy
    if (url.pathname.startsWith('/rpc/')) {
      const path = url.pathname.replace('/rpc', '');
      const target = new URL(path + url.search, env.RPC_ORIGIN);
      const res = await forward(request, target);
      return withCors(res, origin);
    }

    // Faucet proxy (optional)
    if (url.pathname.startsWith('/faucet')) {
      const path = url.pathname.replace('/faucet', '') || '/';
      const target = new URL(path + url.search, env.FAUCET_ORIGIN);
      const res = await forward(request, target);
      return withCors(res, origin);
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders(origin) });
  },
};

function corsHeaders(origin) {
  const h = new Headers();
  h.set('Access-Control-Allow-Origin', origin || '*');
  h.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  h.set('Access-Control-Allow-Headers', '*,Content-Type,Authorization');
  h.set('Access-Control-Max-Age', '86400');
  return h;
}

function addJSONCors(headers) {
  headers.set('content-type', 'application/json');
  return headers;
}

function withCors(res, origin) {
  const newHeaders = new Headers(res.headers);
  newHeaders.set('Access-Control-Allow-Origin', origin || '*');
  newHeaders.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  newHeaders.set('Access-Control-Allow-Headers', '*,Content-Type,Authorization');
  return new Response(res.body, { status: res.status, headers: newHeaders });
}

async function forward(request, target) {
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('content-length');
  headers.set('origin', target.origin);

  const init = {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer(),
    redirect: 'manual',
  };

  return fetch(target.toString(), init);
}