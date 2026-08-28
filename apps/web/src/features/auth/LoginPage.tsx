import { zodResolver } from '@hookform/resolvers/zod';
import { LoginRequestSchema, type LoginRequest } from '@lop-sach/contracts';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { login } from './auth.api.js';

export interface LoginPageProps {
  readonly onAuthenticated: () => void;
}
export function LoginPage({ onAuthenticated }: LoginPageProps): React.JSX.Element {
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginRequest>({
    resolver: zodResolver(LoginRequestSchema),
    defaultValues: { username: '', password: '' },
  });
  const submit = handleSubmit(async (values) => {
    try {
      await login(values);
      onAuthenticated();
    } catch {
      setError('root', { message: 'Không thể đăng nhập. Kiểm tra tên đăng nhập và mật khẩu.' });
    }
  });
  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <img className="login-brand-logo" src="/icons/logo-nobackground.png" alt="Logo Lớp Sạch" />
        <p className="eyebrow">Lớp Sạch</p>
        <h1 id="login-title">Đăng nhập để phân công trực nhật</h1>
        <p className="muted">Dành cho người phụ trách lịch trực của lớp.</p>
        <form onSubmit={(event) => void submit(event)} noValidate>
          <label htmlFor="username">Tên đăng nhập</label>
          <input
            id="username"
            autoComplete="username"
            placeholder="Tên đăng nhập"
            {...register('username')}
            aria-invalid={Boolean(errors.username)}
          />
          {errors.username ? <p className="field-error">{errors.username.message}</p> : null}
          <label htmlFor="password">Mật khẩu</label>
          <div className="login-password-field">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Password"
              {...register('password')}
              aria-invalid={Boolean(errors.password)}
            />
            <button
              className="login-password-toggle"
              type="button"
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((current) => !current)}
            >
              {showPassword ? (
                <EyeOff size={19} aria-hidden="true" />
              ) : (
                <Eye size={19} aria-hidden="true" />
              )}
            </button>
          </div>
          {errors.password ? <p className="field-error">{errors.password.message}</p> : null}
          {errors.root ? (
            <p className="form-error" role="alert">
              {errors.root.message}
            </p>
          ) : null}
          <button type="submit" disabled={isSubmitting}>
            <LogIn size={18} aria-hidden="true" />
            {isSubmitting ? 'Đang đăng nhập' : 'Đăng nhập'}
          </button>
        </form>
      </section>
    </main>
  );
}
