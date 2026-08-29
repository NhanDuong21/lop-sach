const navigationLabels = ['Tuần này', 'Lớp học', 'Lịch sử', 'Cài đặt'] as const;

export function AppStartupShell(): React.JSX.Element {
  return (
    <div className="app-layout startup-layout" role="status" aria-label="Đang mở Lớp Sạch">
      <aside className="sidebar startup-sidebar" aria-hidden="true">
        <div className="sidebar-brand">
          <img className="brand-logo" src="/icons/logo-nobackground.png" alt="" />
          <div>
            <strong>Lớp Sạch</strong>
            <span className="startup-line startup-line-class" />
          </div>
        </div>
        <nav>
          {navigationLabels.map((label, index) => (
            <div className={index === 0 ? 'startup-nav active' : 'startup-nav'} key={label}>
              <span className="startup-nav-icon" />
              <span>{label}</span>
            </div>
          ))}
        </nav>
        <div className="sidebar-account startup-account">
          <div>
            <small>Đang kết nối</small>
            <span className="startup-line startup-line-account" />
          </div>
        </div>
      </aside>
      <div className="app-column">
        <header className="topbar">
          <div className="topbar-brand">
            <img className="mobile-brand-logo" src="/icons/logo-nobackground.png" alt="" />
            <div>
              <strong>Lớp Sạch</strong>
              <small>Đang mở lớp học</small>
            </div>
          </div>
        </header>
        <main className="page-container current-week-container startup-content">
          <div className="startup-heading">
            <span className="startup-line startup-line-eyebrow" />
            <span className="startup-line startup-line-title" />
            <span className="startup-line startup-line-subtitle" />
          </div>
          <section className="startup-card-grid" aria-hidden="true">
            <div className="startup-card startup-card-wide">
              <span className="startup-line startup-line-card-title" />
              <span className="startup-line startup-line-card-body" />
              <span className="startup-line startup-line-card-body startup-line-card-short" />
            </div>
            <div className="startup-card">
              <span className="startup-line startup-line-card-title" />
              <span className="startup-line startup-line-card-body" />
            </div>
            <div className="startup-card">
              <span className="startup-line startup-line-card-title" />
              <span className="startup-line startup-line-card-body" />
            </div>
          </section>
        </main>
      </div>
      <span className="sr-only">Đang kiểm tra phiên và tải thông tin lớp.</span>
    </div>
  );
}
