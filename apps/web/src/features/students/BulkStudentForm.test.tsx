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
    await userEvent.click(screen.getByRole('button', { name: 'Thêm 2 học sinh' }));
    expect(onSubmit).toHaveBeenCalledWith({
      groupId: 'group-1',
      displayNames: ['Nguyễn Văn An', 'Trần Thị Bình'],
    });
  });
});
