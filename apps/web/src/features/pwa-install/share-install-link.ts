export type ShareInstallResult = 'shared' | 'copied' | 'cancelled';

interface ShareNavigator {
  readonly clipboard?: Pick<Clipboard, 'writeText'>;
  readonly share?: (data: ShareData) => Promise<void>;
}

function isCancelledShare(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError'
  );
}

async function copyWithFallback(
  text: string,
  navigatorLike: ShareNavigator,
  documentLike: Document,
): Promise<void> {
  if (navigatorLike.clipboard) {
    try {
      await navigatorLike.clipboard.writeText(text);
      return;
    } catch {
      // A selection-based fallback still works in older or restricted browsers.
    }
  }
  const field = documentLike.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.opacity = '0';
  documentLike.body.append(field);
  field.select();
  const copied = documentLike.execCommand('copy');
  field.remove();
  if (!copied) throw new Error('Trình duyệt không cho phép sao chép.');
}

export async function shareInstallLink(
  url: string,
  navigatorLike: ShareNavigator = navigator,
  documentLike: Document = document,
): Promise<ShareInstallResult> {
  if (navigatorLike.share) {
    try {
      await navigatorLike.share({
        title: 'Lớp Sạch',
        text: 'Cài Lớp Sạch để xem lịch trực, điểm danh và thông báo của lớp.',
        url,
      });
      return 'shared';
    } catch (error) {
      if (isCancelledShare(error)) return 'cancelled';
    }
  }
  await copyWithFallback(url, navigatorLike, documentLike);
  return 'copied';
}
