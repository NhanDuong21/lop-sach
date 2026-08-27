import { describe, expect, it, vi } from 'vitest';
import {
  buildUpstreamHeaders,
  createProxyConfig,
  proxyRequest,
  validateProxyPath,
} from './proxy-core.js';

const config = createProxyConfig({
  LOP_SACH_API_ORIGIN: 'http://127.0.0.1:3000',
  LOP_SACH_PROXY_SECRET: 'a'.repeat(32),
  NODE_ENV: 'test',
});

describe('fixed upstream proxy', () => {
  it('allows only the API v1 route space', () => {
    expect(validateProxyPath('/api/v1/auth/me?x=1')).toBe('/api/v1/auth/me?x=1');
    expect(() => validateProxyPath('/api/internal')).toThrow('PROXY_ROUTE_NOT_ALLOWED');
    expect(() => validateProxyPath('https://attacker.invalid/api/v1')).toThrow();
  });
  it('forwards allowlisted headers and sanitized platform IP only', () => {
    const headers = buildUpstreamHeaders(
      new Headers({
        cookie: 'session=x',
        origin: 'https://app.test',
        authorization: 'Bearer no',
        connection: 'upgrade',
        'x-request-id': 'request-123',
        'x-vercel-forwarded-for': '203.0.113.7, bad',
      }),
      config,
    );
    expect(headers.get('cookie')).toBe('session=x');
    expect(headers.get('origin')).toBe('https://app.test');
    expect(headers.get('x-request-id')).toBe('request-123');
    expect(headers.get('authorization')).toBeNull();
    expect(headers.get('connection')).toBeNull();
    expect(headers.get('x-forwarded-for')).toBe('203.0.113.7');
  });

  it('drops untrusted client IP values', () => {
    const headers = buildUpstreamHeaders(
      new Headers({
        'x-forwarded-for': '198.51.100.4',
        'x-real-ip': '198.51.100.5',
        'x-vercel-forwarded-for': 'not-an-ip',
      }),
      config,
    );
    expect(headers.get('x-forwarded-for')).toBeNull();
    expect(headers.get('x-real-ip')).toBeNull();
  });

  it('preserves method, query and body without accepting an alternate target', async () => {
    const fetcher = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));
    const body = new TextEncoder().encode('{"username":"owner"}');
    await proxyRequest(
      {
        method: 'POST',
        pathAndQuery: '/api/v1/auth/login?continue=https%3A%2F%2Fattacker.invalid',
        headers: new Headers({ 'content-type': 'application/json' }),
        body,
      },
      config,
      fetcher,
    );
    const calls = fetcher.mock.calls as unknown as Array<[URL, RequestInit]>;
    const [target, options] = calls[0] as [URL, RequestInit];
    expect(String(target)).toBe(
      'http://127.0.0.1:3000/api/v1/auth/login?continue=https%3A%2F%2Fattacker.invalid',
    );
    expect(options?.method).toBe('POST');
    expect(new Uint8Array(options?.body as ArrayBuffer)).toEqual(body);
  });

  it('rejects bodies over the route-specific limit before contacting upstream', async () => {
    const fetcher = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));
    await expect(
      proxyRequest(
        {
          method: 'POST',
          pathAndQuery: '/api/v1/auth/login',
          headers: new Headers(),
          body: new Uint8Array(256 * 1024 + 1),
        },
        config,
        fetcher,
      ),
    ).rejects.toThrow('PROXY_BODY_TOO_LARGE');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('preserves separate cookies and forces no-store', async () => {
    const responseHeaders = new Headers({ 'content-type': 'application/json' });
    responseHeaders.append('set-cookie', 'a=1; Path=/');
    responseHeaders.append('set-cookie', 'b=2; Path=/');
    const fetcher = vi.fn(() =>
      Promise.resolve(new Response('{}', { status: 200, headers: responseHeaders })),
    );
    const result = await proxyRequest(
      { method: 'GET', pathAndQuery: '/api/v1/auth/me', headers: new Headers() },
      config,
      fetcher,
    );
    expect(result.setCookies).toEqual(['a=1; Path=/', 'b=2; Path=/']);
    expect(result.headers.get('cache-control')).toBe('no-store');
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
