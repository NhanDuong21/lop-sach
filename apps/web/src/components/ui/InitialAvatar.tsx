function initials(value: string): string {
  const words = value.trim().split(/\s+/u).filter(Boolean);
  if (words.length === 0) return '';
  return words
    .slice(-2)
    .map((word) => word.slice(0, 1))
    .join('')
    .toLocaleUpperCase('vi-VN');
}

export function InitialAvatar({
  name,
  size = 'medium',
}: {
  readonly name: string;
  readonly size?: 'small' | 'medium' | 'large';
}): React.JSX.Element {
  return (
    <span className={`initial-avatar initial-avatar-${size}`} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
