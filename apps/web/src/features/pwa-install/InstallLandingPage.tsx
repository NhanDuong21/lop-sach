import {
  AppWindow,
  BellRing,
  BookOpen,
  CalendarCheck2,
  Download,
  QrCode,
  RefreshCw,
  Share2,
  UsersRound,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastRegion } from '../../components/ui/ToastRegion.js';
import { InstallGuideDialog } from './InstallGuideDialog.js';
import { InstallPhonePreview } from './InstallPhonePreview.js';
import { InstallQrCard } from './InstallQrCard.js';
import { InstallSteps } from './InstallSteps.js';
import { APP_ENTRY_ROUTE, buildCanonicalInstallUrl } from './install-url.js';
import { browserNavigator, detectInstallPlatform } from './platform-detection.js';
import { shareInstallLink } from './share-install-link.js';
import { usePwaInstall } from './use-pwa-install.js';
import './install-landing.css';

const features = [
  {
    icon: CalendarCheck2,
    title: 'Phân công trực nhật',
    description: 'Rõ ràng, minh bạch',
  },
  { icon: UsersRound, title: 'Điểm danh nhanh', description: 'Đơn giản, tiện lợi' },
  { icon: BellRing, title: 'Thông báo kịp thời', description: 'Không bỏ lỡ thông tin' },
] as const;

export function InstallLandingPage(): React.JSX.Element {
  const navigate = useNavigate();
  const install = usePwaInstall();
  const platform = useMemo(() => detectInstallPlatform(browserNavigator()), []);
  const installUrl = useMemo(() => buildCanonicalInstallUrl(window.location.href), []);
  const [guideOpen, setGuideOpen] = useState(false);
  const [toast, setToast] = useState<string>();
  const toastTimer = useRef<number | undefined>(undefined);
  const previouslyInstalled = useRef(install.installedInSession);

  const announce = (message: string): void => {
    window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(undefined), 3200);
  };

  useEffect(() => {
    if (install.standalone) void navigate(APP_ENTRY_ROUTE, { replace: true });
  }, [install.standalone, navigate]);

  useEffect(() => {
    if (install.installedInSession && !previouslyInstalled.current)
      announce('Lớp Sạch đã được cài đặt');
    previouslyInstalled.current = install.installedInSession;
  }, [install.installedInSession]);

  useEffect(() => {
    const previousTitle = document.title;
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousDescription = description?.content;
    document.title = 'Cài đặt Lớp Sạch';
    if (description)
      description.content = 'Cài Lớp Sạch để xem lịch trực, điểm danh và thông báo của lớp.';
    return () => {
      window.clearTimeout(toastTimer.current);
      document.title = previousTitle;
      if (description && previousDescription) description.content = previousDescription;
    };
  }, []);

  const handleInstall = async (): Promise<void> => {
    if (install.standalone || install.installedInSession) {
      void navigate(APP_ENTRY_ROUTE);
      return;
    }
    if (install.canPrompt) {
      try {
        const outcome = await install.promptInstall();
        if (outcome !== 'unavailable') return;
      } catch {
        // The manual guide remains available if a browser prompt fails unexpectedly.
      }
    }
    setGuideOpen(true);
  };

  const handleShare = async (): Promise<void> => {
    try {
      const result = await shareInstallLink(installUrl);
      if (result === 'copied') announce('Đã sao chép link cài đặt');
    } catch {
      announce('Không thể sao chép. Hãy dùng đường dẫn trên thanh địa chỉ.');
    }
  };

  const scrollToGuide = (): void => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.querySelector('#huong-dan')?.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  const primaryLabel =
    install.standalone || install.installedInSession ? 'Mở Lớp Sạch' : 'Cài ứng dụng ngay';

  return (
    <main className="install-page">
      <section className="install-hero" aria-labelledby="install-title">
        <div className="install-first-fold">
          <div className="install-hero-grid">
            <div className="install-hero-copy">
              <header className="install-brand">
                <img src="/landing/logo-lop-sach.png" alt="Logo Lớp Sạch" />
                <strong>Lớp Sạch</strong>
              </header>
              <p className="install-eyebrow">Ứng dụng dành cho lớp</p>
              <h1 id="install-title">
                <span className="install-title-main">Ứng dụng phân công</span>
                <span className="install-title-accent">trực nhật lớp</span>
              </h1>
              <p className="install-description">
                Quản lý lịch trực, điểm danh và thông báo của lớp nhanh chóng, rõ ràng.
              </p>

              <div className="install-feature-panel" aria-label="Lợi ích của Lớp Sạch">
                {features.map((feature) => {
                  const Icon = feature.icon;
                  return (
                    <article className="install-feature" key={feature.title}>
                      <span aria-hidden="true">
                        <Icon size={26} strokeWidth={2.1} />
                      </span>
                      <div>
                        <strong>{feature.title}</strong>
                        <small>{feature.description}</small>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="install-actions">
                <button
                  type="button"
                  className="install-primary-action"
                  onClick={() => void handleInstall()}
                >
                  {install.standalone || install.installedInSession ? (
                    <AppWindow size={21} aria-hidden="true" />
                  ) : (
                    <Download size={21} aria-hidden="true" />
                  )}
                  {primaryLabel}
                </button>
                <a className="install-secondary-action install-desktop-qr-link" href="#ma-qr">
                  <QrCode size={21} aria-hidden="true" />
                  Quét mã QR
                </a>
                <button
                  type="button"
                  className="install-secondary-action install-mobile-guide-button"
                  onClick={scrollToGuide}
                >
                  <BookOpen size={21} aria-hidden="true" />
                  Hướng dẫn cài đặt
                </button>
              </div>

              <div className="install-trust-row" aria-label="Thông tin cài đặt">
                <span>
                  <Zap size={16} aria-hidden="true" /> Cài nhanh
                </span>
                <span>
                  <AppWindow size={16} aria-hidden="true" /> Mở như ứng dụng
                </span>
                <span>
                  <RefreshCw size={16} aria-hidden="true" /> Tự động cập nhật
                </span>
              </div>

              <button
                type="button"
                className="install-mobile-share-button"
                onClick={() => void handleShare()}
              >
                <Share2 size={20} aria-hidden="true" />
                Chia sẻ link cài đặt
              </button>
            </div>

            <InstallPhonePreview />
          </div>

          <InstallQrCard installUrl={installUrl} onShare={() => void handleShare()} />
        </div>
      </section>

      <InstallSteps />

      <section className="install-mascot-quote" aria-label="Thông điệp Lớp Sạch">
        <img src="/landing/mascot-cleaning.png" alt="Mèo Lớp Sạch vui vẻ cầm chổi" loading="lazy" />
        <blockquote>
          Cùng nhau giữ lớp sạch,
          <br />
          cùng nhau tạo kỷ niệm đẹp!
        </blockquote>
      </section>

      <footer className="install-footer">
        <div className="install-footer-brand">
          <img src="/landing/logo-lop-sach.png" alt="" />
          <div>
            <strong>Lớp Sạch</strong>
            <span>Đoàn kết · Tích cực · Tiến bộ</span>
          </div>
        </div>
        <button type="button" onClick={() => void handleShare()}>
          <Share2 size={19} aria-hidden="true" />
          Chia sẻ link cài đặt
        </button>
      </footer>

      <InstallGuideDialog
        open={guideOpen}
        platform={platform}
        onClose={() => setGuideOpen(false)}
      />
      <ToastRegion {...(toast ? { message: toast } : {})} />
    </main>
  );
}
