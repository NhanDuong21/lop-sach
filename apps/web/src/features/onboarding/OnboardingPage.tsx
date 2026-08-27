import { SCHOOL_DAYS, type Classroom, type SchoolDay } from '@lop-sach/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button.js';
import { LoadingState } from '../../components/ui/LoadingState.js';
import { Notice } from '../../components/ui/Notice.js';
import { ApiError } from '../../lib/api-client.js';
import { schoolDayLabels } from '../../lib/vietnamese-labels.js';
import { createClassroom, getClassroom, patchClassroom } from '../classroom/classroom.api.js';
import { GroupsPanel } from '../classroom/GroupsPanel.js';
import { StudentsPage } from '../students/StudentsPage.js';
import { TaskTemplatesPage } from '../tasks/TaskTemplatesPage.js';
import { OnboardingProgress } from './onboarding-steps.js';

function inferredSchoolYear(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(new Date());
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const start = month >= 8 ? year : year - 1;
  return `${start}-${start + 1}`;
}

export function ClassroomSetupForm({
  classroom,
  pending,
  onSubmit,
}: {
  readonly classroom?: Classroom;
  readonly pending?: boolean;
  readonly onSubmit: (input: {
    readonly name: string;
    readonly schoolYear: string;
    readonly schoolDays: readonly SchoolDay[];
  }) => void;
}): React.JSX.Element {
  const [name, setName] = useState(classroom?.name ?? '10C8');
  const [schoolYear, setSchoolYear] = useState(classroom?.schoolYear ?? inferredSchoolYear());
  const [schoolDays, setSchoolDays] = useState<SchoolDay[]>(
    classroom ? [...classroom.schoolDays] : SCHOOL_DAYS.slice(0, 6),
  );
  const toggle = (day: SchoolDay): void =>
    setSchoolDays((current) =>
      current.includes(day)
        ? current.filter((item) => item !== day)
        : SCHOOL_DAYS.filter((item) => [...current, day].includes(item)),
    );
  return (
    <form
      className="editor-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ name: name.trim(), schoolYear: schoolYear.trim(), schoolDays });
      }}
    >
      <div className="form-grid">
        <div>
          <label htmlFor="onboarding-class-name">Tên lớp</label>
          <input
            id="onboarding-class-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="onboarding-school-year">Năm học</label>
          <input
            id="onboarding-school-year"
            value={schoolYear}
            onChange={(event) => setSchoolYear(event.target.value)}
            required
          />
        </div>
      </div>
      <fieldset>
        <legend>Ngày học mặc định</legend>
        <div className="choice-grid">
          {SCHOOL_DAYS.map((day) => (
            <label className="check-choice" key={day}>
              <input
                type="checkbox"
                checked={schoolDays.includes(day)}
                onChange={() => toggle(day)}
              />
              {schoolDayLabels[day]}
            </label>
          ))}
        </div>
      </fieldset>
      <Button
        type="submit"
        disabled={pending || !name.trim() || !schoolYear.trim() || schoolDays.length === 0}
      >
        {classroom ? 'Lưu và tiếp tục' : 'Tạo lớp và tiếp tục'}
      </Button>
    </form>
  );
}

export function OnboardingPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const classroomQuery = useQuery({ queryKey: ['classroom'], queryFn: getClassroom, retry: false });
  const classroomMissing =
    classroomQuery.error instanceof ApiError && classroomQuery.error.problem.status === 404;
  const saveInitial = useMutation({
    mutationFn: createClassroom,
    onSuccess: (data) => {
      queryClient.setQueryData(['classroom'], data);
      void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
  const update = useMutation({
    mutationFn: ({
      classroom,
      step,
      complete = false,
      settings,
    }: {
      readonly classroom: Classroom;
      readonly step: number;
      readonly complete?: boolean;
      readonly settings?: {
        readonly name: string;
        readonly schoolYear: string;
        readonly schoolDays: readonly SchoolDay[];
      };
    }) =>
      patchClassroom({
        ...(settings ?? {}),
        onboardingStep: step,
        ...(complete ? { completeOnboarding: true } : {}),
        expectedVersion: classroom.version,
      }),
    onSuccess: async (data, variables) => {
      queryClient.setQueryData(['classroom'], data);
      if (variables.complete) {
        await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
        void navigate('/');
      }
    },
  });
  if (classroomQuery.isPending)
    return (
      <main className="onboarding-shell">
        <LoadingState />
      </main>
    );
  if (!classroomQuery.data && !classroomMissing)
    return (
      <main className="onboarding-shell">
        <Notice tone="error">Không thể tải tiến độ thiết lập.</Notice>
      </main>
    );
  if (!classroomQuery.data)
    return (
      <main className="onboarding-shell">
        <header>
          <p className="eyebrow">Bắt đầu với Lớp Sạch</p>
          <h1>Thiết lập lớp của bạn</h1>
          <p>Thông tin này có thể sửa lại trong phần Lớp.</p>
        </header>
        <section className="card">
          <ClassroomSetupForm
            pending={saveInitial.isPending}
            onSubmit={(input) => saveInitial.mutate(input)}
          />
          {saveInitial.isError ? (
            <Notice tone="error">Không thể tạo lớp. Hãy kiểm tra kết nối và thử lại.</Notice>
          ) : null}
        </section>
      </main>
    );
  const classroom = classroomQuery.data;
  if (classroom.onboarding.completedAt) return <Navigate to="/" replace />;
  const step = classroom.onboarding.currentStep;
  const next = (): void => update.mutate({ classroom, step: Math.min(6, step + 1) });
  const previous = (): void => update.mutate({ classroom, step: Math.max(1, step - 1) });
  return (
    <main className="onboarding-shell">
      <header>
        <p className="eyebrow">Thiết lập lần đầu</p>
        <h1>{classroom.name}</h1>
        <p>Tiến độ được lưu sau từng bước, bạn có thể quay lại tiếp tục.</p>
      </header>
      <OnboardingProgress currentStep={step} />
      {update.isError ? (
        <Notice tone="error">Không lưu được tiến độ. Hãy tải lại và thử lại.</Notice>
      ) : null}
      {step === 1 ? (
        <section className="card">
          <h2>Thông tin lớp</h2>
          <ClassroomSetupForm
            classroom={classroom}
            pending={update.isPending}
            onSubmit={(settings) => update.mutate({ classroom, step: 2, settings })}
          />
        </section>
      ) : null}
      {step === 2 ? (
        <section className="card">
          <GroupsPanel classroom={classroom} />
        </section>
      ) : null}
      {step === 3 ? <StudentsPage compact /> : null}
      {step === 4 ? <TaskTemplatesPage compact /> : null}
      {step === 5 ? (
        <section className="card review-card">
          <CheckCircle2 size={32} aria-hidden="true" />
          <h2>Kiểm tra trước khi hoàn tất</h2>
          <dl>
            <div>
              <dt>Lớp</dt>
              <dd>
                {classroom.name} · {classroom.schoolYear}
              </dd>
            </div>
            <div>
              <dt>Tổ đang dùng</dt>
              <dd>{classroom.groups.filter((group) => group.active).length}</dd>
            </div>
            <div>
              <dt>Ngày học</dt>
              <dd>{classroom.schoolDays.length} ngày/tuần</dd>
            </div>
          </dl>
          <p>Bạn vẫn có thể sửa học sinh và công việc sau khi hoàn tất.</p>
        </section>
      ) : null}
      {step === 6 ? (
        <section className="card review-card">
          <CheckCircle2 size={36} aria-hidden="true" />
          <h2>Sẵn sàng lập lịch trực</h2>
          <p>Hoàn tất thiết lập để vào màn hình chính.</p>
          <Button
            onClick={() => update.mutate({ classroom, step: 6, complete: true })}
            disabled={update.isPending}
          >
            Hoàn tất thiết lập
          </Button>
        </section>
      ) : null}
      {step > 1 && step < 6 ? (
        <div className="wizard-actions">
          <Button variant="secondary" onClick={previous} disabled={update.isPending}>
            Quay lại
          </Button>
          <Button onClick={next} disabled={update.isPending}>
            Tiếp tục
          </Button>
        </div>
      ) : null}
    </main>
  );
}
