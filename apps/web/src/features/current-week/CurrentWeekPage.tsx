import { addDateOnlyDays, mondayOfWeek, parseDateOnly, type DutyWeek } from '@lop-sach/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  CalendarPlus,
  CalendarRange,
  ChartNoAxesCombined,
  Check,
  Plus,
  Share2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.js';
import { LoadingState } from '../../components/ui/LoadingState.js';
import { Notice } from '../../components/ui/Notice.js';
import { StatusBadge } from '../../components/ui/StatusBadge.js';
import { deleteDutyWeek, getDutyWeekOverview } from '../duty-weeks/duty-weeks.api.js';
import { WeekSummary } from './WeekSummary.js';
import {
  cacheCurrentWeek,
  readCachedCurrentWeek,
  type CachedCurrentWeek,
} from '../../lib/offline-cache.js';
import { useOnlineState } from '../../lib/online-state.js';
import { currentDateInVietnam, formatDutyDate, formatWeekRange } from '../../lib/date-labels.js';

function currentMonday(): string {
  return mondayOfWeek(parseDateOnly(currentDateInVietnam()));
}

function dutyWeekEnd(week: DutyWeek): string | undefined {
  return week.taskOccurrences
    .filter((occurrence) => occurrence.enabled)
    .map((occurrence) => occurrence.date)
    .sort()
    .at(-1);
}

export function CurrentWeekPage({
  classroomName,
}: {
  readonly classroomName: string;
}): React.JSX.Element {
  const queryClient = useQueryClient();
  const weekStart = currentMonday();
  const today = currentDateInVietnam();
  const online = useOnlineState();
  const [cached, setCached] = useState<CachedCurrentWeek | null>(null);
  const [cacheLoaded, setCacheLoaded] = useState(false);
  const [draftToDelete, setDraftToDelete] = useState<DutyWeek | null>(null);
  useEffect(() => {
    let active = true;
    void readCachedCurrentWeek(weekStart).then((value) => {
      if (active) {
        setCached(value);
        setCacheLoaded(true);
      }
    });
    return () => {
      active = false;
    };
  }, [weekStart]);
  const overview = useQuery({
    queryKey: ['duty-weeks', 'overview', weekStart],
    queryFn: () => getDutyWeekOverview(weekStart),
    enabled: online,
  });
  const deleteDraft = useMutation({
    mutationFn: (draft: DutyWeek) => deleteDutyWeek(draft.id, draft.version),
    onSuccess: async () => {
      setDraftToDelete(null);
      await queryClient.invalidateQueries({ queryKey: ['duty-weeks'] });
    },
  });
  const onlineWeek = overview.data?.currentWeek ?? undefined;
  useEffect(() => {
    if (!onlineWeek || onlineWeek.status === 'DRAFT') return;
    void cacheCurrentWeek(onlineWeek, classroomName).then(() =>
      readCachedCurrentWeek(weekStart).then(setCached),
    );
  }, [classroomName, onlineWeek, weekStart]);
  if (!online) {
    if (!cacheLoaded) return <LoadingState label="Đang mở lịch tuần đã lưu" />;
    return (
      <div className="page-stack offline-current-week">
        <header className="page-heading">
          <p className="eyebrow">{cached?.classroomName ?? 'Lớp Sạch'}</p>
          <h1>Tuần này · Ngoại tuyến</h1>
          <p>Chỉ xem bản đã lưu; mọi thay đổi đều bị chặn.</p>
        </header>
        {!cached ? (
          <section className="card empty-state">
            <CalendarDays size={32} aria-hidden="true" />
            <h2>Chưa có lịch đã lưu cho tuần này</h2>
            <p>Hãy kết nối mạng và mở một lịch đã công bố trước.</p>
          </section>
        ) : (
          <section className="card">
            <div className="section-heading">
              <div>
                <h2>{cached.groupName}</h2>
                <p>
                  {cached.publicationRevision > 1
                    ? `Lần cập nhật ${cached.publicationRevision} · `
                    : 'Lịch đã công bố · '}
                  Lưu lúc {new Date(cached.cachedAt).toLocaleString('vi-VN')}
                </p>
              </div>
              <StatusBadge tone="success">
                {cached.status === 'COMPLETED' ? 'Đã hoàn thành' : 'Đã công bố'}
              </StatusBadge>
            </div>
            {cached.warningCount > 0 ? (
              <Notice tone="warning">Có {cached.warningCount} lưu ý khi phân công.</Notice>
            ) : null}
            <div className="week-summary">
              {cached.days.map((day) => (
                <section className="summary-day" key={day.date}>
                  <h3>{formatDutyDate(day.date)}</h3>
                  {day.tasks.map((task, index) => (
                    <div className="summary-task" key={`${day.date}-${String(index)}`}>
                      <strong>{task.taskName}</strong>
                      <span>{task.performers.join(', ')}</span>
                    </div>
                  ))}
                </section>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }
  if (overview.isPending) return <LoadingState label="Đang tải lịch tuần này" />;
  if (overview.isError) return <Notice tone="error">Không tải được lịch tuần này.</Notice>;
  const week = onlineWeek;
  const resumableDrafts = [...(overview.data.draftWeeks ?? [])]
    .filter((draft) => draft.id !== week?.id)
    .sort((left, right) => left.weekStart.localeCompare(right.weekStart));
  const weekEnd = week ? dutyWeekEnd(week) : undefined;
  const todayOccurrences =
    week?.taskOccurrences.filter((occurrence) => occurrence.enabled && occurrence.date === today) ??
    [];
  return (
    <div className="page-stack current-week-page">
      <header className="page-heading current-week-heading">
        <p className="eyebrow">{classroomName}</p>
        <h1>Tuần này</h1>
        <p>Việc cần làm hôm nay và bước tiếp theo của tuần trực.</p>
      </header>
      {resumableDrafts.length > 0 ? (
        <section className="card draft-resume-section" aria-labelledby="draft-weeks-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Chưa công bố</p>
              <h2 id="draft-weeks-title">Tuần đang chuẩn bị</h2>
              <p>
                Bản nháp được lưu tự động; bạn có thể tiếp tục sau khi thoát hoặc tải lại trang.
              </p>
            </div>
          </div>
          <div className="draft-resume-list">
            {resumableDrafts.map((draft) => {
              const draftEnd = dutyWeekEnd(draft);
              return (
                <article className="draft-resume-row" key={draft.id}>
                  <div>
                    <strong>Tuần {formatWeekRange(draft.weekStart, draftEnd)}</strong>
                    <span>Tổ trực: {draft.groupSnapshot.name}</span>
                  </div>
                  <StatusBadge tone="warning">Bản nháp</StatusBadge>
                  <div className="draft-resume-actions">
                    <Link className="button button-primary" to={`/weeks/${draft.id}`}>
                      Tiếp tục chuẩn bị
                    </Link>
                    <Button
                      variant="danger"
                      aria-label={`Xóa bản nháp tuần ${formatWeekRange(draft.weekStart, draftEnd)}`}
                      onClick={() => {
                        deleteDraft.reset();
                        setDraftToDelete(draft);
                      }}
                    >
                      Xóa bản nháp
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
      {!week ? (
        <section className="card empty-state">
          <CalendarDays size={32} aria-hidden="true" />
          <h2>Chưa có lịch tuần này</h2>
          <p>Tạo tuần, đánh dấu vắng mặt rồi để hệ thống đề xuất phân công.</p>
          <Link className="button button-primary" to="/weeks/new">
            <Plus size={17} aria-hidden="true" />
            Chuẩn bị tuần trực
          </Link>
        </section>
      ) : (
        <>
          <section
            className={`card current-week-hero current-week-hero-${week.status.toLowerCase()}`}
            aria-labelledby="current-week-title"
          >
            <div className="current-week-hero-intro">
              <p className="current-week-range">
                <CalendarDays size={22} aria-hidden="true" />
                <strong>{formatWeekRange(week.weekStart, weekEnd)}</strong>
              </p>
              <h2 id="current-week-title">Tổ trực: {week.groupSnapshot.name}</h2>
              <div className="current-week-status-line">
                {week.publicationRevision > 1 ? (
                  <span>Lần cập nhật {week.publicationRevision}</span>
                ) : null}
                <span className="current-week-status-badge">
                  <StatusBadge tone={week.status === 'DRAFT' ? 'warning' : 'success'}>
                    {week.status === 'DRAFT'
                      ? 'Bản nháp'
                      : week.status === 'PUBLISHED'
                        ? 'Đã công bố'
                        : 'Đã hoàn thành'}
                  </StatusBadge>
                </span>
              </div>
            </div>
            <div className="current-week-mascot" aria-hidden="true">
              <p className="current-week-mascot-speech">
                Giữ lớp sạch,
                <br />
                việc nhỏ nhưng ý nghĩa!
              </p>
              <img src="/images/meoconcamchoi.png" alt="" />
            </div>
            <div className="current-week-hero-body">
              {week.status === 'DRAFT' ? (
                <div className="next-step-panel">
                  <strong>Tuần này chưa có lịch chính thức</strong>
                  <p>Tiếp tục chuẩn bị, tạo phân công và kiểm tra trước khi công bố.</p>
                  <div className="button-row current-week-hero-actions">
                    <Link className="button button-primary" to={`/weeks/${week.id}`}>
                      Tiếp tục chuẩn bị tuần
                    </Link>
                    <Button
                      variant="danger"
                      onClick={() => {
                        deleteDraft.reset();
                        setDraftToDelete(week);
                      }}
                    >
                      Xóa bản nháp
                    </Button>
                  </div>
                </div>
              ) : week.status === 'COMPLETED' ? (
                <>
                  <div className="completed-week-panel">
                    <span className="completed-week-icon" aria-hidden="true">
                      <Check size={24} strokeWidth={2.5} />
                    </span>
                    <div>
                      <strong>Tuần {formatWeekRange(week.weekStart, weekEnd)} đã hoàn thành</strong>
                      <p>Lịch và người thực tế đã làm được lưu cố định trong lịch sử.</p>
                    </div>
                  </div>
                  <div className="button-row current-week-hero-actions">
                    <Link
                      className="button button-primary"
                      to={`/weeks/new?weekStart=${addDateOnlyDays(parseDateOnly(week.weekStart), 7)}`}
                    >
                      <CalendarPlus size={19} aria-hidden="true" />
                      Lập lịch tuần sau
                    </Link>
                    <Link className="button button-secondary" to={`/weeks/${week.id}`}>
                      <ChartNoAxesCombined size={19} aria-hidden="true" />
                      Xem kết quả tuần
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <section className="today-panel" aria-labelledby="today-title">
                    <p className="eyebrow">Hôm nay</p>
                    <h3 id="today-title">{formatDutyDate(today)}</h3>
                    {todayOccurrences.length > 0 ? (
                      <div className="today-task-list">
                        {todayOccurrences.map((occurrence) => (
                          <div className="today-task" key={occurrence.id}>
                            <strong>{occurrence.taskName}</strong>
                            <span>
                              {occurrence.slots
                                .map(
                                  (slot) =>
                                    week.assignments.find(
                                      (assignment) => assignment.slotId === slot.id,
                                    )?.actualStudentDisplayName ??
                                    week.assignments.find(
                                      (assignment) => assignment.slotId === slot.id,
                                    )?.studentDisplayName ??
                                    'Chưa phân công',
                                )
                                .join(', ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="muted">Hôm nay lớp không có công việc trực nhật.</p>
                    )}
                  </section>
                  <div className="button-row current-week-hero-actions hero-actions">
                    <Link className="button button-primary" to={`/weeks/${week.id}#share`}>
                      <Share2 size={17} aria-hidden="true" /> Chia sẻ lịch
                    </Link>
                    <Link className="button button-secondary" to={`/weeks/${week.id}`}>
                      <CalendarRange size={17} aria-hidden="true" /> Xem chi tiết tuần
                    </Link>
                  </div>
                </>
              )}
            </div>
          </section>
          {week.status !== 'DRAFT' ? (
            <section className="full-week-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow full-week-eyebrow">
                    <CalendarDays size={18} aria-hidden="true" />
                    Lịch cả tuần
                  </p>
                  <h2>Tất cả ngày trực</h2>
                </div>
              </div>
              <WeekSummary week={week} today={today} />
            </section>
          ) : null}
        </>
      )}
      {week?.status === 'PUBLISHED' ? (
        <div className="button-row next-week-action">
          <Link
            className="button button-secondary"
            to={`/weeks/new?weekStart=${addDateOnlyDays(parseDateOnly(week.weekStart), 7)}`}
          >
            Lập lịch tuần sau
          </Link>
        </div>
      ) : null}
      <ConfirmDialog
        open={draftToDelete !== null}
        title="Xóa bản nháp?"
        description={`Lịch nháp tuần ${draftToDelete ? formatWeekRange(draftToDelete.weekStart, dutyWeekEnd(draftToDelete)) : ''}, các đánh dấu vắng mặt, công việc phát sinh và phân công chưa công bố sẽ bị xóa vĩnh viễn. Bạn có thể tạo lại tuần này sau đó.`}
        confirmLabel="Xóa bản nháp"
        pending={deleteDraft.isPending}
        pendingLabel="Đang xóa…"
        error={deleteDraft.isError ? deleteDraft.error.message : null}
        onCancel={() => {
          if (!deleteDraft.isPending) setDraftToDelete(null);
        }}
        onConfirm={() => {
          if (draftToDelete) deleteDraft.mutate(draftToDelete);
        }}
      />
    </div>
  );
}
