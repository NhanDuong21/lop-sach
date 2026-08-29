import { describe, expect, it } from 'vitest';
import { buildCanonicalInstallUrl } from './install-url.js';
import {
  detectInstallPlatform,
  isIosDevice,
  isStandaloneDisplay,
  type PlatformNavigator,
} from './platform-detection.js';

function makeNavigator(overrides: Partial<PlatformNavigator> = {}): PlatformNavigator {
  return {
    userAgent: 'Mozilla/5.0 Chrome/140 Safari/537.36',
    platform: 'Win32',
    maxTouchPoints: 0,
    ...overrides,
  };
}

describe('PWA install platform detection', () => {
  it('recognizes iPhone and desktop-like iPadOS without treating desktop Mac as iOS', () => {
    expect(
      isIosDevice(makeNavigator({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)' })),
    ).toBe(true);
    expect(isIosDevice(makeNavigator({ platform: 'MacIntel', maxTouchPoints: 5 }))).toBe(true);
    expect(isIosDevice(makeNavigator({ platform: 'MacIntel', maxTouchPoints: 0 }))).toBe(false);
  });

  it('prioritizes in-app browsers and distinguishes Android from other browsers', () => {
    expect(detectInstallPlatform(makeNavigator({ userAgent: 'Zalo Android' }))).toBe(
      'IN_APP_BROWSER',
    );
    expect(
      detectInstallPlatform(makeNavigator({ userAgent: 'Mozilla/5.0 Android 16 Chrome' })),
    ).toBe('ANDROID');
    expect(detectInstallPlatform(makeNavigator())).toBe('OTHER');
  });

  it('detects standalone display without persisting an installed flag', () => {
    expect(isStandaloneDisplay(true, makeNavigator())).toBe(true);
    expect(isStandaloneDisplay(false, makeNavigator({ standalone: true }))).toBe(true);
    expect(isStandaloneDisplay(false, makeNavigator())).toBe(false);
  });

  it('builds a canonical install URL while preserving invitation query parameters', () => {
    expect(buildCanonicalInstallUrl('https://example.test/weeks/abc?invite=10c8#today')).toBe(
      'https://example.test/install?invite=10c8',
    );
  });
});
