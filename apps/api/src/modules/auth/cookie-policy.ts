import type { CookieOptions } from 'express';

export interface SessionCookiePolicy {
  readonly name: '__Host-lop_sach_session' | 'lop_sach_session';
  readonly options: CookieOptions;
}

export function sessionCookiePolicy(environment: 'development' | 'test' | 'production'): SessionCookiePolicy {
  const production = environment === 'production';
  return {
    name: production ? '__Host-lop_sach_session' : 'lop_sach_session',
    options: {
      httpOnly: true,
      secure: production,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1_000,
    },
  };
}
