import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { changePassword } from '../auth/auth.api.js';
import { PasswordPanel } from './PasswordPanel.js';

vi.mock('../auth/auth.api.js', () => ({ changePassword: vi.fn() }));

function renderPanel(): void {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <PasswordPanel />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PasswordPanel', () => {
  beforeEach(() => vi.mocked(changePassword).mockReset());

  it('lets native validation run and reads password-manager-filled values from the form', async () => {
    vi.mocked(changePassword).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderPanel();

    const submit = screen.getByRole('button', { name: 'Đổi mật khẩu và đăng xuất' });
    expect(submit).toBeEnabled();
    screen.getByLabelText<HTMLInputElement>('Mật khẩu hiện tại').value = 'current-password-value';
    screen.getByLabelText<HTMLInputElement>('Mật khẩu mới').value = 'new-password-value';
    screen.getByLabelText<HTMLInputElement>('Nhập lại mật khẩu mới').value = 'new-password-value';

    await user.click(submit);

    await waitFor(() =>
      expect(changePassword).toHaveBeenCalledWith({
        currentPassword: 'current-password-value',
        newPassword: 'new-password-value',
      }),
    );
  });
});
