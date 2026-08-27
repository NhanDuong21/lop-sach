import type { PropsWithChildren } from 'react';

export function StatusBadge({ children, tone = 'neutral' }: PropsWithChildren<{ readonly tone?: 'neutral' | 'success' | 'warning' }>): React.JSX.Element {
  return <span className={`status-badge status-${tone}`}>{children}</span>;
}
