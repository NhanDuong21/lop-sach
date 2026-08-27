import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from './api-client.js';

describe('offline mutation guard', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('blocks mutations before fetch while offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(
      apiRequest('/duty-weeks/test/publish', { method: 'post', body: '{}' }),
    ).rejects.toThrow('Không thể thay đổi dữ liệu khi ngoại tuyến.');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
