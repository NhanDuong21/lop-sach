import { zodResolver } from '@hookform/resolvers/zod';
import { LoginRequestSchema, type LoginRequest } from '@lop-sach/contracts';
import { LogIn } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { login } from './auth.api.js';

export interface LoginPageProps { readonly onAuthenticated: () => void }
export function LoginPage({ onAuthenticated }: LoginPageProps): React.JSX.Element {
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<LoginRequest>({ resolver: zodResolver(LoginRequestSchema), defaultValues: { username: '', password: '' } });
  const submit = handleSubmit(async (values) => {
    try { await login(values); onAuthenticated(); }
    catch { setError('root', { message: 'Không thể đăng nhập. Kiểm tra tên đăng nhập và mật khẩu.' }); }
  });
  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <div className="brand-mark" aria-hidden="true">LS</div>
        <p className="eyebrow">Lớp Sạch</p>
        <h1 id="login-title">Đăng nhập để phân công trực nhật</h1>
        <p className="muted">Dành cho người phụ trách lịch trực của lớp.</p>
        <form onSubmit={(event) => void submit(event)} noValidate>
          <label htmlFor="username">Tên đăng nhập</label>
          <input id="username" autoComplete="username" {...register('username')} aria-invalid={Boolean(errors.username)} />
          {errors.username ? <p className="field-error">{errors.username.message}</p> : null}
          <label htmlFor="password">Mật khẩu</label>
          <input id="password" type="password" autoComplete="current-password" {...register('password')} aria-invalid={Boolean(errors.password)} />
          {errors.password ? <p className="field-error">{errors.password.message}</p> : null}
          {errors.root ? <p className="form-error" role="alert">{errors.root.message}</p> : null}
          <button type="submit" disabled={isSubmitting}><LogIn size={18} aria-hidden="true" />{isSubmitting ? 'Đang đăng nhập' : 'Đăng nhập'}</button>
        </form>
      </section>
    </main>
  );
}
