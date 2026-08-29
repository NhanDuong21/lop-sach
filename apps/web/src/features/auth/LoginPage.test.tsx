import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { login } from './auth.api.js';
import { LoginPage } from './LoginPage.js';

vi.mock('./auth.api.js', () => ({ login: vi.fn() }));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.mocked(login).mockReset();
  });
  afterEach(() => {
    cleanup();
  });

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
    expect(screen.getByLabelText('Tên đăng nhập')).toHaveAttribute(
      'placeholder',
      'Nhập tên đăng nhập',
    );
    const password = screen.getByLabelText('Mật khẩu');
    expect(password).toHaveAttribute('placeholder', 'Nhập mật khẩu');
    expect(password).toHaveAttribute('type', 'password');
    expect(document.querySelector('.login-mascot')).toHaveAttribute(
      'src',
      '/images/meoconcamchoi.png',
    );
    expect(document.querySelector('.login-mascot')).toHaveAttribute('aria-hidden', 'true');

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

  it('shows accessible Vietnamese validation errors without calling the API', async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <LoginPage onAuthenticated={() => undefined} />
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    const username = screen.getByLabelText('Tên đăng nhập');
    const password = screen.getByLabelText('Mật khẩu');
    expect(screen.getByText('Tên đăng nhập phải có từ 1 đến 80 ký tự.')).toHaveAttribute(
      'id',
      'username-error',
    );
    expect(screen.getByText('Mật khẩu phải có từ 8 đến 256 ký tự.')).toHaveAttribute(
      'id',
      'password-error',
    );
    expect(username).toHaveAttribute('aria-describedby', 'username-error');
    expect(password).toHaveAttribute('aria-describedby', 'password-error');
    expect(login).not.toHaveBeenCalled();
  });

  it('keeps the submit state stable while login is pending and completes the auth callback', async () => {
    const user = userEvent.setup();
    let resolveLogin: ((value: Awaited<ReturnType<typeof login>>) => void) | undefined;
    vi.mocked(login).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveLogin = resolve;
        }),
    );
    const onAuthenticated = vi.fn();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <LoginPage onAuthenticated={onAuthenticated} />
      </QueryClientProvider>,
    );

    await user.type(screen.getByLabelText('Tên đăng nhập'), 'owner');
    await user.type(screen.getByLabelText('Mật khẩu'), 'valid-password');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    const pendingButton = await screen.findByRole('button', { name: 'Đang đăng nhập' });
    expect(pendingButton).toBeDisabled();
    expect(pendingButton).toHaveAttribute('aria-busy', 'true');
    expect(login).toHaveBeenCalledWith({ username: 'owner', password: 'valid-password' });

    const loginResult = {
      id: 'owner-id',
      displayName: 'Owner',
      username: 'owner',
      hasClassroom: false,
      onboardingCompleted: false,
      classroom: null,
    };
    resolveLogin?.(loginResult);
    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith(loginResult));
  });
});
