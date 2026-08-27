import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button.js';
import { Notice } from '../../components/ui/Notice.js';
import { changePassword } from '../auth/auth.api.js';

export function PasswordPanel(): React.JSX.Element {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const mutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => { queryClient.clear(); void navigate('/login'); },
  });
  const mismatch = confirmation.length > 0 && confirmation !== newPassword;
  return <section className="card"><h2>Đổi mật khẩu</h2><p>Đổi mật khẩu sẽ thu hồi tất cả phiên, bao gồm phiên hiện tại.</p><form onSubmit={(event) => { event.preventDefault(); if (!mismatch) mutation.mutate({ currentPassword, newPassword }); }}><div className="form-grid"><div><label htmlFor="current-password">Mật khẩu hiện tại</label><input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></div><div><label htmlFor="new-password">Mật khẩu mới</label><input id="new-password" type="password" autoComplete="new-password" minLength={12} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></div><div><label htmlFor="confirm-password">Nhập lại mật khẩu mới</label><input id="confirm-password" type="password" autoComplete="new-password" minLength={12} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></div></div>{mismatch ? <Notice tone="error">Mật khẩu nhập lại chưa khớp.</Notice> : null}{mutation.isError ? <Notice tone="error">Không thể đổi mật khẩu. Kiểm tra mật khẩu hiện tại.</Notice> : null}<Button type="submit" disabled={mutation.isPending || currentPassword.length < 8 || newPassword.length < 12 || confirmation !== newPassword}>Đổi mật khẩu và đăng xuất</Button></form></section>;
}
