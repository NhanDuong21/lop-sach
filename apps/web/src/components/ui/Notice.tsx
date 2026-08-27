import type { PropsWithChildren } from 'react';

export function Notice({ children, tone = 'info' }: PropsWithChildren<{ readonly tone?: 'info' | 'success' | 'warning' | 'error' }>): React.JSX.Element {
  return <div className={`notice notice-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>{children}</div>;
}
