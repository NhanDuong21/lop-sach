import type { IncomingMessage, ServerResponse } from 'node:http';
import { createProxyConfig, proxyRequest, resolveProxyPath } from './_proxy-core.js';

async function readBody(request: IncomingMessage, limit: number): Promise<Uint8Array> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
    size += buffer.length;
    if (size > limit) throw new Error('PROXY_BODY_TOO_LARGE');
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  try {
    const config = createProxyConfig(process.env);
    const headers = new Headers();
    for (const [name, value] of Object.entries(request.headers)) {
      if (Array.isArray(value)) headers.set(name, value.join(', '));
      else if (value !== undefined) headers.set(name, value);
    }
    const pathAndQuery = resolveProxyPath(request.url);
    const backup = pathAndQuery.startsWith('/api/v1/backup/');
    const body =
      request.method === 'GET' || request.method === 'HEAD'
        ? undefined
        : await readBody(request, backup ? 2 * 1024 * 1024 : 256 * 1024);
    const result = await proxyRequest(
      {
        method: request.method ?? 'GET',
        pathAndQuery,
        headers,
        ...(body ? { body } : {}),
      },
      config,
    );
    response.statusCode = result.status;
    for (const [name, value] of result.headers.entries()) response.setHeader(name, value);
    if (result.setCookies.length > 0) response.setHeader('Set-Cookie', [...result.setCookies]);
    response.end(result.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'PROXY_UPSTREAM_UNAVAILABLE';
    response.statusCode =
      message === 'PROXY_ROUTE_NOT_ALLOWED' ? 404 : message === 'PROXY_BODY_TOO_LARGE' ? 413 : 502;
    response.setHeader('Content-Type', 'application/problem+json');
    response.setHeader('Cache-Control', 'no-store');
    response.end(
      JSON.stringify({ code: message, detail: 'Không thể chuyển tiếp request tới API.' }),
    );
  }
}
