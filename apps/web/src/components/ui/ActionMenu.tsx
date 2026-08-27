import { MoreHorizontal } from 'lucide-react';
import { useRef } from 'react';

export interface ActionMenuItem {
  readonly label: string;
  readonly danger?: boolean;
  readonly disabled?: boolean;
  readonly hint?: string;
  readonly onSelect: () => void;
}

export function ActionMenu({
  label,
  items,
}: {
  readonly label: string;
  readonly items: readonly ActionMenuItem[];
}): React.JSX.Element {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  return (
    <details className="action-menu" ref={detailsRef}>
      <summary aria-label={label}>
        <MoreHorizontal size={19} aria-hidden="true" />
      </summary>
      <div className="action-menu-panel">
        {items.map((item) => (
          <button
            type="button"
            className={item.danger ? 'danger-action' : undefined}
            disabled={item.disabled}
            key={item.label}
            title={item.hint}
            onClick={() => {
              detailsRef.current?.removeAttribute('open');
              item.onSelect();
            }}
          >
            <span>{item.label}</span>
            {item.hint ? <small>{item.hint}</small> : null}
          </button>
        ))}
      </div>
    </details>
  );
}
