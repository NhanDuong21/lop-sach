export function LoadingState({
  label = 'Đang tải dữ liệu',
}: {
  readonly label?: string;
}): React.JSX.Element {
  return (
    <div className="loading-state" role="status">
      <span className="loading-dot" aria-hidden="true" />
      {label}
    </div>
  );
}
