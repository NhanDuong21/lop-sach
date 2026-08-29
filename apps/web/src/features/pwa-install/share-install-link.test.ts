import { describe, expect, it, vi } from 'vitest';
import { shareInstallLink } from './share-install-link.js';

describe('shareInstallLink', () => {
  it('uses native share with the canonical install URL when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    await expect(
      shareInstallLink('https://example.test/install', { share }, document),
    ).resolves.toBe('shared');
    expect(share).toHaveBeenCalledWith({
      title: 'Lớp Sạch',
      text: 'Cài Lớp Sạch để xem lịch trực, điểm danh và thông báo của lớp.',
      url: 'https://example.test/install',
    });
  });

  it('silently treats a cancelled native share as cancellation', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError'));
    const writeText = vi.fn();
    await expect(
      shareInstallLink(
        'https://example.test/install',
        { share, clipboard: { writeText } },
        document,
      ),
    ).resolves.toBe('cancelled');
    expect(writeText).not.toHaveBeenCalled();
  });

  it('copies the link when native share is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    await expect(
      shareInstallLink('https://example.test/install', { clipboard: { writeText } }, document),
    ).resolves.toBe('copied');
    expect(writeText).toHaveBeenCalledWith('https://example.test/install');
  });
});
