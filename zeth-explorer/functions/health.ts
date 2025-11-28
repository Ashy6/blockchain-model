export const onRequest: PagesFunction = async ({ request, env }) => {
  const originHeader = request.headers.get('origin') || '*';
  const restBase = (env as any)?.REST_ORIGIN || 'https://zethchain-proxy.zengjx1998.workers.dev/rest';
  const rpcBase = (env as any)?.RPC_ORIGIN || 'https://zethchain-proxy.zengjx1998.workers.dev/rpc';
  try {
    const [restRes, rpcRes] = await Promise.all([
      fetch(new URL('/cosmos/base/tendermint/v1beta1/blocks/latest', restBase).toString()),
      fetch(new URL('/status', rpcBase).toString()),
    ]);
    const ok = restRes.ok && rpcRes.ok;
    const h = new Headers();
    h.set('Access-Control-Allow-Origin', originHeader);
    h.set('content-type', 'application/json');
    return new Response(JSON.stringify({ ok, rest: restRes.status, rpc: rpcRes.status }), { status: ok ? 200 : 502, headers: h });
  } catch (e: any) {
    const h = new Headers();
    h.set('Access-Control-Allow-Origin', originHeader);
    h.set('content-type', 'application/json');
    return new Response(JSON.stringify({ ok: false, error: e?.message || String(e) }), { status: 500, headers: h });
  }
};