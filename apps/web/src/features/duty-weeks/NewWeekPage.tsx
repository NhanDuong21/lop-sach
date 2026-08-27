import { mondayOfWeek, parseDateOnly, type DutyGroupSelectionBasis } from '@lop-sach/contracts';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CalendarPlus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button.js';
import { LoadingState } from '../../components/ui/LoadingState.js';
import { Notice } from '../../components/ui/Notice.js';
import { ApiError } from '../../lib/api-client.js';
import { getClassroom } from '../classroom/classroom.api.js';
import { createDutyWeek } from './duty-weeks.api.js';

function todayInClassroomTimezone(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year ?? ''}-${value.month ?? ''}-${value.day ?? ''}`;
}

export function NewWeekPage(): React.JSX.Element {
  const navigate = useNavigate();
  const classroom = useQuery({ queryKey: ['classroom'], queryFn: getClassroom });
  const [weekStart, setWeekStart] = useState(() =>
    mondayOfWeek(parseDateOnly(todayInClassroomTimezone())),
  );
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectionBasis, setSelectionBasis] = useState<DutyGroupSelectionBasis>('MANUAL');
  const [selectionNote, setSelectionNote] = useState('');
  const create = useMutation({
    mutationFn: createDutyWeek,
    onSuccess: (week) => {
      void navigate(`/weeks/${week.id}`);
    },
  });
  if (classroom.isPending) return <LoadingState label="Đang tải dữ liệu lớp" />;
  if (!classroom.data) return <Notice tone="error">Không tải được dữ liệu lớp.</Notice>;
  const activeGroups = classroom.data.groups.filter((group) => group.active);
  const effectiveGroupId = selectedGroupId || activeGroups[0]?.id || '';
  return (
    <div className="page-stack">
      <header className="page-heading">
        <p className="eyebrow">Phân công trực</p>
        <h1>Tạo tuần mới</h1>
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
        <form
          onSubmit={(event) => {
            event.preventDefault();
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
              <label htmlFor="selection-basis">Cơ sở lựa chọn</label>
              <select
                id="selection-basis"
                value={selectionBasis}
                onChange={(event) =>
                  setSelectionBasis(event.target.value as DutyGroupSelectionBasis)
                }
              >
                <option value="MANUAL">Tự chọn</option>
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
          </div>
          <Button type="submit" disabled={create.isPending || !effectiveGroupId}>
            Tạo tuần và kiểm tra vắng mặt
          </Button>
        </form>
      </section>
    </div>
  );
}
