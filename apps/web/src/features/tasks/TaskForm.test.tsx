import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TaskForm } from './TaskForm.js';

describe('TaskForm', () => {
  it('submits explicit headcount, workload and eligibility without inferring from the name', async () => {
    const submit = vi.fn();
    render(<TaskForm defaultSchoolDays={['MONDAY']} onSubmit={submit} />);
    await userEvent.type(screen.getByLabelText('Tên công việc'), 'Mang nước');
    await userEvent.selectOptions(screen.getByLabelText('Độ nặng'), '3');
    await userEvent.selectOptions(screen.getByLabelText('Ai có thể làm?'), 'ANY');
    await userEvent.click(screen.getByRole('button', { name: 'Thêm công việc' }));
    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Mang nước', workloadLevel: 3, eligibilityRule: 'ANY' }),
    );
  });
});
