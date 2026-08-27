import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { readonly variant?: 'primary' | 'secondary' | 'danger' }
export function Button({ children, className = '', variant = 'primary', type = 'button', ...props }: PropsWithChildren<ButtonProps>): React.JSX.Element {
  return <button type={type} className={`button button-${variant} ${className}`.trim()} {...props}>{children}</button>;
}
