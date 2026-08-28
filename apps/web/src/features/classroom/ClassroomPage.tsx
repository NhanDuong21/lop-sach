import {
  SCHOOL_DAYS,
  type Classroom,
  type SchoolDay,
  type TaskTemplate,
} from '@lop-sach/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Pencil,
  Save,
  School,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClassroomTabs } from '../../components/layout/ClassroomTabs.js';
import { Button } from '../../components/ui/Button.js';
import { InitialAvatar } from '../../components/ui/InitialAvatar.js';
import { LoadingState } from '../../components/ui/LoadingState.js';
import { Notice } from '../../components/ui/Notice.js';
import { eligibilityLabels, schoolDayLabels, workloadLabels } from '../../lib/vietnamese-labels.js';
import { listStudents } from '../students/students.api.js';
import { listTasks } from '../tasks/tasks.api.js';
import { getClassroom, patchClassroom } from './classroom.api.js';
import { GroupsPanel } from './GroupsPanel.js';

const shortSchoolDayLabels: Record<SchoolDay, string> = {
  MONDAY: 'T2',
  TUESDAY: 'T3',
  WEDNESDAY: 'T4',
  THURSDAY: 'T5',
  FRIDAY: 'T6',
  SATURDAY: 'T7',
  SUNDAY: 'CN',
};

function taskDaySummary(task: TaskTemplate, classroomDays: readonly SchoolDay[]): string {
  if (task.schoolDays.length === classroomDays.length && task.schoolDays.length > 1)
    return `${shortSchoolDayLabels[task.schoolDays[0] ?? 'MONDAY']}–${shortSchoolDayLabels[task.schoolDays.at(-1) ?? 'MONDAY']}`;
  return task.schoolDays.map((day) => shortSchoolDayLabels[day]).join(', ');
}

export function ClassroomPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const classroom = useQuery({ queryKey: ['classroom'], queryFn: getClassroom });
  const students = useQuery({ queryKey: ['students'], queryFn: listStudents });
  const tasks = useQuery({ queryKey: ['tasks'], queryFn: listTasks });
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
  if (classroom.isPending || students.isPending || tasks.isPending) return <LoadingState />;
  if (!classroom.data || !students.data || !tasks.data)
    return <Notice tone="error">Không tải được thông tin lớp.</Notice>;
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
  const activeStudents = students.data.filter((student) => student.active);
  const inactiveStudentCount = students.data.length - activeStudents.length;
  const activeTasks = tasks.data
    .filter((task) => task.active)
    .sort((left, right) => left.order - right.order);
  const activeGroupCount = classroom.data.groups.filter((group) => group.active).length;
  const studentPreview = [...activeStudents]
    .sort((left, right) => left.displayName.localeCompare(right.displayName, 'vi'))
    .slice(0, 5);
  const schoolYearDisplay = classroom.data.schoolYear.replace('-', '–');
  return (
    <div className="page-stack class-module-page class-overview-page">
      <ClassroomTabs />
      <header className="page-heading class-overview-heading">
        <p className="eyebrow">Lớp học</p>
        <h1>Thông tin chung</h1>
        <p>Thông tin ít thay đổi được trình bày để xem trước, chỉnh sửa khi cần.</p>
      </header>

      <section className="class-hub-hero" aria-labelledby="classroom-name">
        <div className="class-hub-copy">
          <p className="eyebrow">Lớp học</p>
          <h2 id="classroom-name">{classroom.data.name}</h2>
          <p>Quản lý thành viên, tổ và công việc trực của lớp.</p>
        </div>
        <div className="class-metric-grid" aria-label="Tóm tắt lớp học">
          <div className="class-metric">
            <Users size={24} aria-hidden="true" />
            <div>
              <strong>{activeStudents.length}</strong>
              <span>học sinh</span>
            </div>
          </div>
          <div className="class-metric">
            <School size={24} aria-hidden="true" />
            <div>
              <strong>{activeGroupCount}</strong>
              <span>tổ</span>
            </div>
          </div>
          <div className="class-metric">
            <ClipboardList size={24} aria-hidden="true" />
            <div>
              <strong>{activeTasks.length}</strong>
              <span>công việc trực</span>
            </div>
          </div>
          <div className="class-metric class-metric-school-year">
            <CalendarDays size={24} aria-hidden="true" />
            <div>
              <strong>{schoolYearDisplay}</strong>
              <span>năm học</span>
            </div>
          </div>
        </div>
        <div className="class-hub-mascot" aria-hidden="true">
          <img src="/images/meoconcamchoi.png" alt="" />
        </div>
      </section>

      <div className="class-overview-layout">
        <div className="class-overview-main">
          <section className="card classroom-information-card" aria-labelledby="class-info-title">
            <div className="section-heading class-card-heading">
              <div>
                <BookOpen size={22} aria-hidden="true" />
                <h2 id="class-info-title">Thông tin lớp</h2>
              </div>
              {!editing ? (
                <Button variant="secondary" onClick={() => setEditing(true)}>
                  <Pencil size={17} aria-hidden="true" /> Chỉnh sửa
                </Button>
              ) : null}
            </div>
            {!editing ? (
              <dl className="class-information-list">
                <div>
                  <dt>Tên lớp</dt>
                  <dd>{classroom.data.name}</dd>
                </div>
                <div>
                  <dt>Năm học</dt>
                  <dd>{schoolYearDisplay}</dd>
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

          <section className="card class-groups-card">
            <GroupsPanel classroom={classroom.data} />
          </section>

          <section className="card class-task-preview" aria-labelledby="task-preview-title">
            <div className="section-heading class-card-heading">
              <div>
                <ClipboardList size={22} aria-hidden="true" />
                <h2 id="task-preview-title">Công việc trực nhật</h2>
              </div>
              <Link className="button button-secondary" to="/class/tasks">
                Xem tất cả
              </Link>
            </div>
            <div className="task-preview-grid">
              {activeTasks.slice(0, 3).map((task) => (
                <article className="task-preview-card" key={task.id}>
                  <div className="task-preview-icon" aria-hidden="true">
                    <ClipboardList size={20} />
                  </div>
                  <div>
                    <strong>{task.name}</strong>
                    <span>{task.requiredStudents} bạn</span>
                    <div className="metadata-chips">
                      <span>{workloadLabels[task.workloadLevel]}</span>
                      <span>{taskDaySummary(task, classroom.data.schoolDays)}</span>
                      <span>{eligibilityLabels[task.eligibilityRule]}</span>
                    </div>
                  </div>
                </article>
              ))}
              {activeTasks.length === 0 ? (
                <p className="muted">Chưa có công việc đang dùng.</p>
              ) : null}
            </div>
          </section>
        </div>

        <aside className="card class-student-preview" aria-labelledby="student-preview-title">
          <div className="section-heading class-card-heading">
            <div>
              <Users size={22} aria-hidden="true" />
              <h2 id="student-preview-title">Học sinh</h2>
            </div>
            <Link className="button button-secondary" to="/class/students">
              Xem tất cả
            </Link>
          </div>
          <p className="class-preview-summary">
            {activeStudents.length} đang tham gia
            {inactiveStudentCount > 0 ? ` · ${inactiveStudentCount} đã ngừng` : ''}
          </p>
          <div className="student-preview-list">
            {studentPreview.map((student) => (
              <article className="student-preview-row" key={student.id}>
                <InitialAvatar name={student.displayName} />
                <div>
                  <strong>{student.displayName}</strong>
                  <span>
                    {classroom.data.groups.find((group) => group.id === student.groupId)?.name ??
                      'Tổ đã lưu'}
                  </span>
                </div>
              </article>
            ))}
          </div>
          <Link className="student-preview-add" to="/class/students">
            Xem và cập nhật danh sách
          </Link>
        </aside>
      </div>

      <nav className="mobile-class-shortcuts" aria-label="Quản lý lớp học">
        <Link to="/class/students">
          <Users size={25} aria-hidden="true" />
          <span>
            <strong>Học sinh</strong>
            <small>
              {activeStudents.length} đang tham gia
              {inactiveStudentCount > 0 ? ` · ${inactiveStudentCount} đã ngừng` : ''}
            </small>
          </span>
          <ChevronRight size={22} aria-hidden="true" />
        </Link>
        <Link to="/class/tasks">
          <ClipboardList size={25} aria-hidden="true" />
          <span>
            <strong>Công việc trực nhật</strong>
            <small>{activeTasks.length} công việc đang dùng</small>
          </span>
          <ChevronRight size={22} aria-hidden="true" />
        </Link>
      </nav>
    </div>
  );
}
