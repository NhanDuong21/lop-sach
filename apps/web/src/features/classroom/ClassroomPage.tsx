import { SCHOOL_DAYS, type Classroom, type SchoolDay } from '@lop-sach/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ClassroomTabs } from '../../components/layout/ClassroomTabs.js';
import { Button } from '../../components/ui/Button.js';
import { LoadingState } from '../../components/ui/LoadingState.js';
import { Notice } from '../../components/ui/Notice.js';
import { schoolDayLabels } from '../../lib/vietnamese-labels.js';
import { getClassroom, patchClassroom } from './classroom.api.js';
import { GroupsPanel } from './GroupsPanel.js';

export function ClassroomPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const classroom = useQuery({ queryKey: ['classroom'], queryFn: getClassroom });
  const [name, setName] = useState('');
  const [schoolYear, setSchoolYear] = useState('');
  const [schoolDays, setSchoolDays] = useState<SchoolDay[]>([]);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (classroom.data) {
      setName(classroom.data.name);
      setSchoolYear(classroom.data.schoolYear);
      setSchoolDays([...classroom.data.schoolDays]);
    }
  }, [classroom.data]);
  const save = useMutation({
    mutationFn: (current: Classroom) =>
      patchClassroom({ name, schoolYear, schoolDays, expectedVersion: current.version }),
    onSuccess: (data) => {
      queryClient.setQueryData(['classroom'], data);
      setEditing(false);
    },
  });
  if (classroom.isPending) return <LoadingState />;
  if (!classroom.data) return <Notice tone="error">Không tải được thông tin lớp.</Notice>;
  const toggleDay = (day: SchoolDay): void =>
    setSchoolDays((current) =>
      current.includes(day)
        ? current.filter((item) => item !== day)
        : SCHOOL_DAYS.filter((item) => [...current, day].includes(item)),
    );
  const resetForm = (): void => {
    setName(classroom.data.name);
    setSchoolYear(classroom.data.schoolYear);
    setSchoolDays([...classroom.data.schoolDays]);
    save.reset();
  };
  const dirty =
    name.trim() !== classroom.data.name ||
    schoolYear.trim() !== classroom.data.schoolYear ||
    schoolDays.join('|') !== classroom.data.schoolDays.join('|');
  return (
    <div className="page-stack">
      <ClassroomTabs />
      <header className="page-heading">
        <p className="eyebrow">Lớp học</p>
        <h1>Thông tin chung</h1>
        <p>Thông tin ít thay đổi được trình bày để xem trước, chỉnh sửa khi cần.</p>
      </header>
      <section className="card classroom-overview">
        <div className="section-heading">
          <div>
            <h2>Thông tin lớp</h2>
            <p>Dữ liệu dùng khi lập các tuần trực mới.</p>
          </div>
          {!editing ? (
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <Pencil size={17} aria-hidden="true" /> Chỉnh sửa
            </Button>
          ) : null}
        </div>
        {!editing ? (
          <dl className="read-only-details">
            <div>
              <dt>Tên lớp</dt>
              <dd>{classroom.data.name}</dd>
            </div>
            <div>
              <dt>Năm học</dt>
              <dd>{classroom.data.schoolYear.replace('-', '–')}</dd>
            </div>
            <div>
              <dt>Ngày học</dt>
              <dd>{classroom.data.schoolDays.map((day) => schoolDayLabels[day]).join(', ')}</dd>
            </div>
          </dl>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate(classroom.data);
            }}
          >
            <div className="form-grid">
              <div>
                <label htmlFor="class-name">Tên lớp</label>
                <input
                  id="class-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  maxLength={60}
                />
              </div>
              <div>
                <label htmlFor="school-year">Năm học</label>
                <input
                  id="school-year"
                  value={schoolYear}
                  onChange={(event) => setSchoolYear(event.target.value)}
                  required
                  maxLength={20}
                />
              </div>
            </div>
            <fieldset>
              <legend>Ngày học trong tuần</legend>
              <div className="choice-grid">
                {SCHOOL_DAYS.map((day) => (
                  <label className="check-choice" key={day}>
                    <input
                      type="checkbox"
                      checked={schoolDays.includes(day)}
                      onChange={() => toggleDay(day)}
                    />
                    {schoolDayLabels[day]}
                  </label>
                ))}
              </div>
            </fieldset>
            {save.isError ? <Notice tone="error">Không thể lưu thông tin lớp.</Notice> : null}
            <div className="button-row form-actions">
              <Button
                variant="secondary"
                onClick={() => {
                  resetForm();
                  setEditing(false);
                }}
              >
                Hủy thay đổi
              </Button>
              <Button
                type="submit"
                disabled={
                  !dirty ||
                  !name.trim() ||
                  !schoolYear.trim() ||
                  schoolDays.length === 0 ||
                  save.isPending
                }
              >
                <Save size={17} aria-hidden="true" /> Lưu thay đổi
              </Button>
            </div>
          </form>
        )}
      </section>
      <section className="card">
        <GroupsPanel classroom={classroom.data} />
      </section>
    </div>
  );
}
