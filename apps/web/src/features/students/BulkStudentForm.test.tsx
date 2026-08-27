import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BulkStudentForm } from './BulkStudentForm.js';

describe('BulkStudentForm', () => {
  it('turns non-empty lines into students with one selected group', async () => {
    const onSubmit = vi.fn();
    render(
      <BulkStudentForm
        groups={[{ id: 'group-1', name: 'Tổ 1', order: 0, active: true }]}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );
    await userEvent.type(
      screen.getByLabelText('Họ và tên, mỗi học sinh một dòng'),
      'Nguyễn Văn An{enter}{enter}Trần Thị Bình',
    );
    expect(screen.getByText(/Đã nhận 2 tên/u)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra danh sách' }));
    expect(screen.getByRole('heading', { name: 'Kiểm tra trước khi thêm' })).toBeInTheDocument();
    expect(screen.getByText('Chưa xác định giới tính · Không có hạn chế')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Thêm 2 học sinh' }));
    expect(onSubmit).toHaveBeenCalledWith({
      groupId: 'group-1',
      displayNames: ['Nguyễn Văn An', 'Trần Thị Bình'],
    });
  });

  it('prevents duplicate input and warns about names already in the class', async () => {
    render(
      <BulkStudentForm
        groups={[{ id: 'group-1', name: 'Tổ 1', order: 0, active: true }]}
        existingNames={['Nguyễn Văn An']}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    const input = screen.getByLabelText('Họ và tên, mỗi học sinh một dòng');
    await userEvent.type(input, 'Nguyễn Văn An{enter}Nguyễn Văn An');
    expect(screen.getByText(/Có tên bị lặp/u)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kiểm tra danh sách' })).toBeDisabled();
    await userEvent.clear(input);
    await userEvent.type(input, 'Nguyễn Văn An{enter}Trần Thị Bình');
    await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra danh sách' }));
    expect(screen.getByText(/Không thêm 1 tên đã có trong lớp/u)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thêm 1 học sinh' })).toBeEnabled();
  });
});
