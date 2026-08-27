import type { Group, TaskTemplate } from '@lop-sach/contracts';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StudentForm } from './StudentForm.js';

describe('StudentForm availability controls', () => {
  const groups: Group[] = [{ id: 'group-1', name: 'Tổ 1', order: 0, active: true }];
  const tasks: TaskTemplate[] = [
    {
      id: 'task-1',
      classroomId: 'class-1',
      name: 'Quét lớp',
      active: true,
      order: 0,
      schoolDays: ['MONDAY'],
      requiredStudents: 2,
      workloadLevel: 2,
      eligibilityRule: 'ANY',
      version: 0,
    },
  ];

  it('keeps the add form focused on basic information', () => {
    render(<StudentForm groups={groups} tasks={tasks} onSubmit={vi.fn()} />);
    expect(screen.getByText(/Sau khi thêm/u)).toBeInTheDocument();
    expect(screen.queryByText('Không giao công việc nặng')).not.toBeInTheDocument();
    expect(screen.queryByText('Hạn chế phân công và thời gian tham gia')).not.toBeInTheDocument();
  });

  it('shows only the three persistent restriction concepts while editing', () => {
    render(
      <StudentForm
        groups={groups}
        tasks={tasks}
        student={{
          id: 'student-1',
          classroomId: 'class-1',
          displayName: 'Nguyễn An',
          groupId: 'group-1',
          active: true,
          gender: 'UNSPECIFIED',
          participationStart: null,
          participationEnd: null,
          restrictions: [],
          version: 0,
        }}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByText('Không giao công việc nặng')).toBeInTheDocument();
    expect(screen.getByText('Không giao công việc cụ thể')).toBeInTheDocument();
    expect(screen.getByText('Miễn trong khoảng ngày')).toBeInTheDocument();
    expect(screen.queryByText('Không có mặt vào ngày')).not.toBeInTheDocument();
    expect(screen.getByText(/Vắng một ngày cụ thể/u)).toBeInTheDocument();
    expect(
      screen.getByText('Hạn chế phân công và thời gian tham gia').closest('details'),
    ).not.toHaveAttribute('open');
  });
});
