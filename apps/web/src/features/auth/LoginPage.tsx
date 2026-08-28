import { zodResolver } from '@hookform/resolvers/zod';
import { LoginRequestSchema, type LoginRequest } from '@lop-sach/contracts';
import { Eye, EyeOff, Leaf, LoaderCircle, LockKeyhole, LogIn, UserRound } from 'lucide-react';
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
  const usernameError = errors.username ? 'Tên đăng nhập phải có từ 1 đến 80 ký tự.' : undefined;
  const passwordError = errors.password ? 'Mật khẩu phải có từ 8 đến 256 ký tự.' : undefined;
  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <header className="login-header">
          <img
            className="login-brand-logo"
            src="/icons/logo-nobackground.png"
            alt="Logo Lớp Sạch"
          />
          <p className="login-brand-name">Lớp Sạch</p>
          <h1 id="login-title">Đăng nhập để phân công trực nhật</h1>
          <p className="login-subtitle">Dành cho người phụ trách lịch trực của lớp.</p>
          <div className="login-divider" aria-hidden="true">
            <Leaf size={16} strokeWidth={2.2} />
          </div>
        </header>

        <form className="login-form" onSubmit={(event) => void submit(event)} noValidate>
          <div className="login-form-field">
            <label htmlFor="username">Tên đăng nhập</label>
            <div className="login-input-shell">
              <UserRound className="login-input-icon" size={20} aria-hidden="true" />
              <input
                id="username"
                autoComplete="username"
                placeholder="Nhập tên đăng nhập"
                {...register('username')}
                aria-invalid={Boolean(usernameError)}
                aria-describedby={usernameError ? 'username-error' : undefined}
              />
            </div>
            {usernameError ? (
              <p id="username-error" className="field-error">
                {usernameError}
              </p>
            ) : null}
          </div>

          <div className="login-form-field">
            <label htmlFor="password">Mật khẩu</label>
            <div className="login-input-shell login-password-field">
              <LockKeyhole className="login-input-icon" size={20} aria-hidden="true" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Nhập mật khẩu"
                {...register('password')}
                aria-invalid={Boolean(passwordError)}
                aria-describedby={passwordError ? 'password-error' : undefined}
              />
              <button
                className="login-password-toggle"
                type="button"
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? (
                  <EyeOff size={20} aria-hidden="true" />
                ) : (
                  <Eye size={20} aria-hidden="true" />
                )}
              </button>
            </div>
            {passwordError ? (
              <p id="password-error" className="field-error">
                {passwordError}
              </p>
            ) : null}
          </div>

          {errors.root ? (
            <p className="form-error login-form-error" role="alert">
              {errors.root.message}
            </p>
          ) : null}

          <button
            className="login-submit"
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? (
              <LoaderCircle className="login-submit-spinner" size={20} aria-hidden="true" />
            ) : (
              <LogIn size={20} aria-hidden="true" />
            )}
            {isSubmitting ? 'Đang đăng nhập' : 'Đăng nhập'}
          </button>
        </form>

        <img className="login-mascot" src="/images/meoconcamchoi.png" alt="" aria-hidden="true" />
      </section>
    </main>
  );
}
