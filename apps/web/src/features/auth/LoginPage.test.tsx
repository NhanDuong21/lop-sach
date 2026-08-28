import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { LoginPage } from './LoginPage.js';

describe('LoginPage', () => {
  it('provides branded credentials fields and toggles password visibility', async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <LoginPage onAuthenticated={() => undefined} />
      </QueryClientProvider>,
    );
    expect(
      screen.getByRole('heading', { name: 'Đăng nhập để phân công trực nhật' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Logo Lớp Sạch' })).toHaveAttribute(
      'src',
      '/icons/logo-nobackground.png',
    );
    expect(screen.getByLabelText('Tên đăng nhập')).toHaveAttribute('placeholder', 'Tên đăng nhập');
    const password = screen.getByLabelText('Mật khẩu');
    expect(password).toHaveAttribute('placeholder', 'Password');
    expect(password).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Hiện mật khẩu' }));

    expect(password).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Ẩn mật khẩu' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(screen.getByRole('button', { name: 'Ẩn mật khẩu' }));

    expect(password).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Hiện mật khẩu' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});
