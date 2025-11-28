export const onRequest: PagesFunction = async ({ request, env, params }) => {
  const url = new URL(request.url);
  const originHeader = request.headers.get('origin') || '*';
  const path = params?.path ? `/${params.path}` : '';
  const base = (env as any)?.RPC_ORIGIN || 'https://zethchain-proxy.zengjx1998.workers.dev/rpc';
  const target = new URL(path + url.search, base);

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('content-length');
  headers.set('origin', target.origin);

  const init: RequestInit = {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer(),
    redirect: 'manual',
  };

  const res = await fetch(target.toString(), init);
  const h = new Headers(res.headers);
  h.set('Access-Control-Allow-Origin', originHeader);
  h.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  h.set('Access-Control-Allow-Headers', '*,Content-Type,Authorization');
  return new Response(res.body, { status: res.status, headers: h });
};