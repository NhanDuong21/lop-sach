import {
  addDateOnlyDays,
  dateOnlyWeekday,
  mondayOfWeek,
  parseDateOnly,
  type DutyGroupSelectionBasis,
  type SchoolDay,
} from '@lop-sach/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarPlus } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button.js';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.js';
import { LoadingState } from '../../components/ui/LoadingState.js';
import { Notice } from '../../components/ui/Notice.js';
import { StatusBadge } from '../../components/ui/StatusBadge.js';
import { ApiError } from '../../lib/api-client.js';
import { currentDateInVietnam, formatWeekRange } from '../../lib/date-labels.js';
import { getClassroom } from '../classroom/classroom.api.js';
import { createDutyWeek, deleteDutyWeek, listDutyWeeks } from './duty-weeks.api.js';

function schoolWeekEnd(weekStart: string, schoolDays: readonly SchoolDay[]): string {
  return (
    Array.from({ length: 7 }, (_, index) => addDateOnlyDays(parseDateOnly(weekStart), index))
      .filter((date) => schoolDays.includes(dateOnlyWeekday(date)))
      .at(-1) ?? addDateOnlyDays(parseDateOnly(weekStart), 6)
  );
}

export function NewWeekPage(): React.JSX.Element {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const classroom = useQuery({ queryKey: ['classroom'], queryFn: getClassroom });
  const [weekStart, setWeekStart] = useState(() => {
    const requestedWeekStart = searchParams.get('weekStart');
    try {
      return mondayOfWeek(parseDateOnly(requestedWeekStart ?? currentDateInVietnam()));
    } catch {
      return mondayOfWeek(parseDateOnly(currentDateInVietnam()));
    }
  });
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectionBasis, setSelectionBasis] = useState<DutyGroupSelectionBasis>('MANUAL');
  const [selectionNote, setSelectionNote] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const existingWeek = useQuery({
    queryKey: ['duty-weeks', 'by-start', weekStart],
    queryFn: () => listDutyWeeks({ from: weekStart, to: weekStart }),
  });
  const create = useMutation({
    mutationFn: createDutyWeek,
    onSuccess: (week) => {
      void queryClient.invalidateQueries({ queryKey: ['duty-weeks'] });
      void navigate(`/weeks/${week.id}`);
    },
  });
  const deleteDraft = useMutation({
    mutationFn: (week: { readonly id: string; readonly version: number }) =>
      deleteDutyWeek(week.id, week.version),
    onSuccess: async () => {
      setDeleteOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['duty-weeks'] });
    },
  });
  if (classroom.isPending || existingWeek.isPending)
    return <LoadingState label="Đang kiểm tra tuần trực" />;
  if (!classroom.data) return <Notice tone="error">Không tải được dữ liệu lớp.</Notice>;
  const activeGroups = classroom.data.groups.filter((group) => group.active);
  const effectiveGroupId = selectedGroupId || activeGroups[0]?.id || '';
  const existing = existingWeek.data?.[0];
  const currentWeekStart = mondayOfWeek(parseDateOnly(currentDateInVietnam()));
  const nextWeekStart = addDateOnlyDays(currentWeekStart, 7);
  const selectedWeekRange = formatWeekRange(
    weekStart,
    schoolWeekEnd(weekStart, classroom.data.schoolDays),
  );
  const existingStatusLabel =
    existing?.status === 'DRAFT'
      ? 'Bản nháp'
      : existing?.status === 'PUBLISHED'
        ? 'Đã công bố'
        : 'Đã hoàn thành';
  return (
    <div className="page-stack">
      <header className="page-heading">
        <p className="eyebrow">Phân công trực</p>
        <h1>Chuẩn bị tuần trực</h1>
        <p>Chọn tuần và tổ trực. Hệ thống chỉ xếp lịch sau khi bạn kiểm tra vắng mặt.</p>
      </header>
      <section className="card">
        <div className="section-heading">
          <div>
            <h2>Thông tin tuần</h2>
            <p>Chọn ngày Thứ Hai để xác định tuần trực.</p>
          </div>
          <CalendarPlus size={24} aria-hidden="true" />
        </div>
        {create.isError ? (
          <Notice tone="error">
            {create.error instanceof ApiError
              ? create.error.problem.detail
              : 'Không thể tạo tuần. Hãy thử lại.'}
          </Notice>
        ) : null}
        {existingWeek.isError ? (
          <Notice tone="error">
            Không thể kiểm tra lịch tuần {selectedWeekRange}. Hãy tải lại trang trước khi tiếp tục.
          </Notice>
        ) : null}
        <div className="week-shortcuts" aria-label="Chọn nhanh tuần trực">
          {[
            { label: 'Tuần hiện tại', value: currentWeekStart },
            { label: 'Tuần kế tiếp', value: nextWeekStart },
          ].map((option) => (
            <button
              type="button"
              className="week-shortcut"
              aria-pressed={weekStart === option.value}
              onClick={() => setWeekStart(option.value)}
              key={option.value}
            >
              <strong>{option.label}</strong>
              <span>
                {formatWeekRange(
                  option.value,
                  schoolWeekEnd(option.value, classroom.data.schoolDays),
                )}
              </span>
            </button>
          ))}
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (existing || existingWeek.isError) return;
            create.mutate({
              weekStart,
              selectedGroupId: effectiveGroupId,
              selectionBasis,
              selectionNote: selectionNote.trim(),
            });
          }}
        >
          <div className="form-grid">
            <div>
              <label htmlFor="week-start">Ngày Thứ Hai đầu tuần</label>
              <input
                id="week-start"
                type="date"
                value={weekStart}
                onChange={(event) => {
                  try {
                    setWeekStart(mondayOfWeek(parseDateOnly(event.target.value)));
                  } catch {
                    setWeekStart(event.target.value as typeof weekStart);
                  }
                }}
                required
              />
            </div>
            {!existing ? (
              <>
                <div>
                  <label htmlFor="selected-group">Tổ trực</label>
                  <select
                    id="selected-group"
                    value={effectiveGroupId}
                    onChange={(event) => setSelectedGroupId(event.target.value)}
                    required
                  >
                    {activeGroups.map((group) => (
                      <option value={group.id} key={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="selection-basis">Vì sao chọn tổ này?</label>
                  <select
                    id="selection-basis"
                    value={selectionBasis}
                    onChange={(event) =>
                      setSelectionBasis(event.target.value as DutyGroupSelectionBasis)
                    }
                  >
                    <option value="MANUAL">Bạn tự chọn</option>
                    <option value="ROTATION">Luân phiên</option>
                    <option value="LOWEST_RANKING">Ưu tiên tổ ít trực</option>
                    <option value="TEACHER_ASSIGNED">Giáo viên chỉ định</option>
                    <option value="OTHER">Khác</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="selection-note">Ghi chú</label>
                  <input
                    id="selection-note"
                    value={selectionNote}
                    maxLength={500}
                    onChange={(event) => setSelectionNote(event.target.value)}
                    placeholder="Không bắt buộc"
                  />
                </div>
              </>
            ) : null}
          </div>
          {existing ? (
            <div className="existing-week-panel">
              <div>
                <StatusBadge tone={existing.status === 'DRAFT' ? 'warning' : 'success'}>
                  {existingStatusLabel}
                </StatusBadge>
                <strong>Tuần {selectedWeekRange} đã có lịch.</strong>
                <span>
                  Tổ trực: {existing.groupSnapshot.name} · Trạng thái: {existingStatusLabel}
                </span>
                <span>Đổi ngày Thứ Hai ở trên nếu bạn muốn chuẩn bị một tuần khác.</span>
              </div>
              <div className="existing-week-actions">
                <Link className="button button-primary" to={`/weeks/${existing.id}`}>
                  {existing.status === 'DRAFT' ? 'Tiếp tục chuẩn bị' : 'Xem tuần đã có'}
                </Link>
                {existing.status === 'DRAFT' ? (
                  <Button
                    variant="danger"
                    onClick={() => {
                      deleteDraft.reset();
                      setDeleteOpen(true);
                    }}
                  >
                    Xóa bản nháp
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <Button
              type="submit"
              disabled={create.isPending || !effectiveGroupId || existingWeek.isError}
            >
              Bắt đầu chuẩn bị tuần
            </Button>
          )}
        </form>
      </section>
      <ConfirmDialog
        open={deleteOpen && existing?.status === 'DRAFT'}
        title="Xóa bản nháp?"
        description={`Các đánh dấu vắng mặt, công việc phát sinh và phân công chưa công bố của tuần ${selectedWeekRange} sẽ bị xóa vĩnh viễn. Sau đó bạn có thể tạo lại lịch cho khoảng ngày này.`}
        confirmLabel="Xóa bản nháp"
        pending={deleteDraft.isPending}
        pendingLabel="Đang xóa…"
        error={deleteDraft.isError ? deleteDraft.error.message : null}
        onCancel={() => {
          if (!deleteDraft.isPending) setDeleteOpen(false);
        }}
        onConfirm={() => {
          if (existing?.status === 'DRAFT') deleteDraft.mutate(existing);
        }}
      />
    </div>
  );
}
