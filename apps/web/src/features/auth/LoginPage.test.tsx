import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LoginPage } from './LoginPage.js';

describe('LoginPage', () => {
  it('provides accessible Vietnamese credentials fields', () => {
    render(<QueryClientProvider client={new QueryClient()}><LoginPage onAuthenticated={() => undefined} /></QueryClientProvider>);
    expect(screen.getByRole('heading', { name: 'Đăng nhập để phân công trực nhật' })).toBeInTheDocument();
    expect(screen.getByLabelText('Tên đăng nhập')).toBeInTheDocument();
    expect(screen.getByLabelText('Mật khẩu')).toHaveAttribute('type', 'password');
  });
});
