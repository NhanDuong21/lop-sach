import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button.js';
import { Notice } from '../../components/ui/Notice.js';
import { changePassword } from '../auth/auth.api.js';

function formString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

export function PasswordPanel(): React.JSX.Element {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [submittedMismatch, setSubmittedMismatch] = useState(false);
  const mutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      queryClient.clear();
      void navigate('/login');
    },
  });
  const mismatch = submittedMismatch || (confirmation.length > 0 && confirmation !== newPassword);
  return (
    <section className="card">
      <div className="section-heading">
        <h2>Đổi mật khẩu</h2>
        <button
          className="button button-ghost password-visibility"
          type="button"
          aria-pressed={showPasswords}
          onClick={() => setShowPasswords((current) => !current)}
        >
          {showPasswords ? (
            <EyeOff size={17} aria-hidden="true" />
          ) : (
            <Eye size={17} aria-hidden="true" />
          )}
          {showPasswords ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        </button>
      </div>
      <p>Đổi mật khẩu sẽ thu hồi tất cả phiên, bao gồm phiên hiện tại.</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const submittedCurrentPassword = formString(formData, 'currentPassword');
          const submittedNewPassword = formString(formData, 'newPassword');
          const submittedConfirmation = formString(formData, 'confirmation');
          if (submittedConfirmation !== submittedNewPassword) {
            setSubmittedMismatch(true);
            return;
          }
          setSubmittedMismatch(false);
          mutation.mutate({
            currentPassword: submittedCurrentPassword,
            newPassword: submittedNewPassword,
          });
        }}
      >
        <div className="form-grid">
          <div>
            <label htmlFor="current-password">Mật khẩu hiện tại</label>
            <input
              id="current-password"
              name="currentPassword"
              type={showPasswords ? 'text' : 'password'}
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => {
                setCurrentPassword(event.target.value);
                setSubmittedMismatch(false);
              }}
              required
            />
          </div>
          <div>
            <label htmlFor="new-password">Mật khẩu mới</label>
            <input
              id="new-password"
              name="newPassword"
              type={showPasswords ? 'text' : 'password'}
              autoComplete="new-password"
              minLength={12}
              value={newPassword}
              onChange={(event) => {
                setNewPassword(event.target.value);
                setSubmittedMismatch(false);
              }}
              required
            />
            <p className="field-hint">Tối thiểu 12 ký tự.</p>
          </div>
          <div>
            <label htmlFor="confirm-password">Nhập lại mật khẩu mới</label>
            <input
              id="confirm-password"
              name="confirmation"
              type={showPasswords ? 'text' : 'password'}
              autoComplete="new-password"
              minLength={12}
              value={confirmation}
              onChange={(event) => {
                setConfirmation(event.target.value);
                setSubmittedMismatch(false);
              }}
              required
            />
          </div>
        </div>
        {mismatch ? <Notice tone="error">Mật khẩu nhập lại chưa khớp.</Notice> : null}
        {mutation.isError ? (
          <Notice tone="error">Không thể đổi mật khẩu. Kiểm tra mật khẩu hiện tại.</Notice>
        ) : null}
        <Button type="submit" disabled={mutation.isPending} aria-busy={mutation.isPending}>
          {mutation.isPending ? 'Đang đổi mật khẩu…' : 'Đổi mật khẩu và đăng xuất'}
        </Button>
      </form>
    </section>
  );
}
