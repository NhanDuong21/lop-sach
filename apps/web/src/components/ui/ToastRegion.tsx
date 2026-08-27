export function ToastRegion({ message }: { readonly message?: string }): React.JSX.Element {
  return (
    <div className="toast-region" aria-live="polite" aria-atomic="true">
      {message ? <div className="toast">{message}</div> : null}
    </div>
  );
}
