import { isIP } from 'node:net';

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  'authorization',
]);
const FORWARDED_HEADERS = new Set([
  'accept',
  'content-type',
  'cookie',
  'origin',
  'if-match',
  'x-request-id',
]);

export interface ProxyConfig {
  readonly upstream: URL;
  readonly secret: string;
}
export interface ProxyInput {
  readonly method: string;
  readonly pathAndQuery: string;
  readonly headers: Headers;
  readonly body?: Uint8Array;
}
export interface ProxyOutput {
  readonly status: number;
  readonly headers: Headers;
  readonly setCookies: readonly string[];
  readonly body: Uint8Array;
}

export function createProxyConfig(environment: NodeJS.ProcessEnv): ProxyConfig {
  const rawOrigin = environment.LOP_SACH_API_ORIGIN;
  const secret = environment.LOP_SACH_PROXY_SECRET;
  if (!rawOrigin || !secret || secret.length < 32)
    throw new Error('Proxy cần fixed upstream và secret tối thiểu 32 ký tự.');
  const upstream = new URL(rawOrigin);
  if (upstream.protocol !== 'https:' && environment.NODE_ENV === 'production')
    throw new Error('Production upstream phải dùng HTTPS.');
  if (
    upstream.username ||
    upstream.password ||
    upstream.pathname !== '/' ||
    upstream.search ||
    upstream.hash
  )
    throw new Error('Upstream phải là một origin cố định, không chứa credential/path/query/hash.');
  return { upstream, secret };
}

export function validateProxyPath(pathAndQuery: string): string {
  const parsed = new URL(pathAndQuery, 'https://proxy.invalid');
  if (parsed.origin !== 'https://proxy.invalid' || !/^\/api\/v1(?:\/|$)/u.test(parsed.pathname))
    throw new Error('PROXY_ROUTE_NOT_ALLOWED');
  return `${parsed.pathname}${parsed.search}`;
}

function sanitizedClientIp(headers: Headers): string | null {
  const platformValue = headers.get('x-vercel-forwarded-for');
  if (!platformValue) return null;
  const candidate = platformValue.split(',')[0]?.trim() ?? '';
  return isIP(candidate) ? candidate : null;
}

export function buildUpstreamHeaders(input: Headers, config: ProxyConfig): Headers {
  const output = new Headers();
  for (const [name, value] of input.entries()) {
    const lower = name.toLowerCase();
    if (FORWARDED_HEADERS.has(lower) && !HOP_BY_HOP.has(lower)) output.set(lower, value);
  }
  const clientIp = sanitizedClientIp(input);
  if (clientIp) output.set('x-forwarded-for', clientIp);
  output.set('x-lop-sach-proxy-secret', config.secret);
  return output;
}

function responseCookies(headers: Headers): readonly string[] {
  const enhanced = headers as Headers & { getSetCookie?: () => string[] };
  return (
    enhanced.getSetCookie?.() ??
    (headers.get('set-cookie') ? [headers.get('set-cookie') as string] : [])
  );
}

export async function proxyRequest(
  input: ProxyInput,
  config: ProxyConfig,
  fetcher: typeof fetch = fetch,
): Promise<ProxyOutput> {
  const path = validateProxyPath(input.pathAndQuery);
  const backup = /^\/api\/v1\/backup\/(?:validate|restore)(?:\?|$)/u.test(path);
  const limit = backup ? 2 * 1024 * 1024 : 256 * 1024;
  if ((input.body?.byteLength ?? 0) > limit) throw new Error('PROXY_BODY_TOO_LARGE');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), backup ? 30_000 : 15_000);
  try {
    const requestInit: RequestInit = {
      method: input.method,
      headers: buildUpstreamHeaders(input.headers, config),
      redirect: 'manual',
      signal: controller.signal,
    };
    if (input.body && input.method !== 'GET' && input.method !== 'HEAD') {
      requestInit.body = Uint8Array.from(input.body).buffer;
    }
    const response = await fetcher(new URL(path, config.upstream), requestInit);
    const headers = new Headers();
    for (const [name, value] of response.headers.entries()) {
      if (!HOP_BY_HOP.has(name.toLowerCase()) && name.toLowerCase() !== 'set-cookie')
        headers.set(name, value);
    }
    headers.set('cache-control', 'no-store');
    return {
      status: response.status,
      headers,
      setCookies: responseCookies(response.headers),
      body: new Uint8Array(await response.arrayBuffer()),
    };
  } finally {
    clearTimeout(timeout);
  }
}
