import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StudentForm } from './StudentForm.js';

describe('StudentForm availability controls', () => {
  it('shows only the three persistent restriction concepts', () => {
    render(<StudentForm groups={[{ id: 'group-1', name: 'Tổ 1', order: 0, active: true }]} tasks={[{ id: 'task-1', classroomId: 'class-1', name: 'Quét lớp', active: true, order: 0, schoolDays: ['MONDAY'], requiredStudents: 2, workloadLevel: 2, eligibilityRule: 'ANY', version: 0 }]} onSubmit={vi.fn()} />);
    expect(screen.getByText('Không giao task nặng')).toBeInTheDocument();
    expect(screen.getByText('Không giao task cụ thể')).toBeInTheDocument();
    expect(screen.getByText('Miễn trong khoảng ngày')).toBeInTheDocument();
    expect(screen.queryByText('Không có mặt vào ngày')).not.toBeInTheDocument();
    expect(screen.getByText(/Vắng một ngày cụ thể/u)).toBeInTheDocument();
  });
});
