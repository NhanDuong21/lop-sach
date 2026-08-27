import { SCHOOL_DAYS, type Classroom, type SchoolDay } from '@lop-sach/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { useEffect, useState } from 'react';
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
    onSuccess: (data) => queryClient.setQueryData(['classroom'], data),
  });
  if (classroom.isPending) return <LoadingState />;
  if (!classroom.data) return <Notice tone="error">Không tải được thông tin lớp.</Notice>;
  const toggleDay = (day: SchoolDay): void =>
    setSchoolDays((current) =>
      current.includes(day)
        ? current.filter((item) => item !== day)
        : SCHOOL_DAYS.filter((item) => [...current, day].includes(item)),
    );
  return (
    <div className="page-stack">
      <header className="page-heading">
        <p className="eyebrow">Thiết lập lớp</p>
        <h1>Thông tin lớp học</h1>
        <p>Tên lớp, năm học và ngày học là dữ liệu đầu vào của lịch trực.</p>
      </header>
      <section className="card">
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
          <Button
            type="submit"
            disabled={
              !name.trim() || !schoolYear.trim() || schoolDays.length === 0 || save.isPending
            }
          >
            <Save size={17} />
            Lưu thông tin lớp
          </Button>
        </form>
      </section>
      <section className="card">
        <GroupsPanel classroom={classroom.data} />
      </section>
    </div>
  );
}
