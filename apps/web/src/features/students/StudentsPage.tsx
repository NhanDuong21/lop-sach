import type { Student } from '@lop-sach/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/ui/Button.js';
import { LoadingState } from '../../components/ui/LoadingState.js';
import { Notice } from '../../components/ui/Notice.js';
import { StatusBadge } from '../../components/ui/StatusBadge.js';
import { getClassroom } from '../classroom/classroom.api.js';
import { listTasks } from '../tasks/tasks.api.js';
import { StudentForm } from './StudentForm.js';
import { createStudent, listStudents, moveStudent, patchStudent, setStudentActive, type StudentWriteInput } from './students.api.js';

export function StudentsPage({ compact = false }: { readonly compact?: boolean }): React.JSX.Element {
  const queryClient = useQueryClient();
  const classroom = useQuery({ queryKey: ['classroom'], queryFn: getClassroom });
  const students = useQuery({ queryKey: ['students'], queryFn: listStudents });
  const tasks = useQuery({ queryKey: ['tasks'], queryFn: listTasks });
  const [editing, setEditing] = useState<Student | 'new'>();
  const [groupFilter, setGroupFilter] = useState('ALL');
  const update = useMutation({
    mutationFn: async ({ input, student }: { readonly input: StudentWriteInput; readonly student?: Student }) => {
      if (!student) return createStudent(input);
      const patched = await patchStudent(student.id, { displayName: input.displayName, gender: input.gender, participationStart: input.participationStart, participationEnd: input.participationEnd, restrictions: input.restrictions, expectedVersion: student.version });
      return input.groupId !== student.groupId ? moveStudent(student.id, input.groupId, patched.version) : patched;
    },
    onSuccess: () => { setEditing(undefined); void queryClient.invalidateQueries({ queryKey: ['students'] }); void queryClient.invalidateQueries({ queryKey: ['classroom'] }); },
  });
  const activeMutation = useMutation({ mutationFn: (student: Student) => setStudentActive(student.id, !student.active, student.version), onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['students'] }); void queryClient.invalidateQueries({ queryKey: ['classroom'] }); } });
  if (classroom.isPending || students.isPending || tasks.isPending) return <LoadingState />;
  if (!classroom.data || !students.data || !tasks.data) return <Notice tone="error">Không tải được danh sách học sinh.</Notice>;
  const filtered = groupFilter === 'ALL' ? students.data : students.data.filter((student) => student.groupId === groupFilter);
  return <div className="page-stack">{compact ? null : <header className="page-heading"><p className="eyebrow">Lớp học</p><h1>Học sinh</h1><p>Chỉ lưu thông tin cần thiết để phân công trực nhật.</p></header>}<section className="card"><div className="section-heading"><div><h2>Danh sách học sinh</h2><p>{students.data.filter((student) => student.active).length} học sinh đang hoạt động</p></div><Button onClick={() => setEditing('new')}><Plus size={17} />Thêm học sinh</Button></div><label htmlFor="group-filter">Lọc theo tổ</label><select id="group-filter" value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)}><option value="ALL">Tất cả tổ</option>{classroom.data.groups.map((group) => <option value={group.id} key={group.id}>{group.name}</option>)}</select>{update.isError || activeMutation.isError ? <Notice tone="error">Không thể lưu học sinh. Hãy kiểm tra phiên bản dữ liệu và thử lại.</Notice> : null}<div className="entity-list">{filtered.length === 0 ? <div className="empty-state"><UserRound size={28} aria-hidden="true" /><h3>Chưa có học sinh trong danh sách này</h3><p>Thêm học sinh và chọn đúng tổ để bắt đầu.</p></div> : filtered.map((student) => <article className="entity-row" key={student.id}><div><strong>{student.displayName}</strong><p>{classroom.data.groups.find((group) => group.id === student.groupId)?.name ?? 'Tổ đã lưu'} · {student.restrictions.length} hạn chế</p></div><StatusBadge tone={student.active ? 'success' : 'neutral'}>{student.active ? 'Đang học' : 'Đã tắt'}</StatusBadge><div className="button-row"><Button variant="secondary" onClick={() => setEditing(student)}>Sửa</Button><Button variant="secondary" onClick={() => activeMutation.mutate(student)}>{student.active ? 'Tắt' : 'Bật'}</Button></div></article>)}</div></section>{editing ? <section className="card"><h2>{editing === 'new' ? 'Thêm học sinh' : `Sửa ${editing.displayName}`}</h2><StudentForm key={editing === 'new' ? 'new' : editing.id} groups={classroom.data.groups} tasks={tasks.data} {...(editing === 'new' ? {} : { student: editing })} pending={update.isPending} onCancel={() => setEditing(undefined)} onSubmit={(input) => update.mutate({ input, ...(editing === 'new' ? {} : { student: editing }) })} /></section> : null}</div>;
}
