import type { PropsWithChildren, ReactNode } from 'react';

export function FormField({ label, htmlFor, hint, error, children }: PropsWithChildren<{ readonly label: string; readonly htmlFor: string; readonly hint?: ReactNode; readonly error?: string }>): React.JSX.Element {
  return <div className="form-field"><label htmlFor={htmlFor}>{label}</label>{hint ? <p className="field-hint">{hint}</p> : null}{children}{error ? <p className="field-error">{error}</p> : null}</div>;
}
