import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ClassroomSetupForm } from './OnboardingPage.js';

describe('ClassroomSetupForm', () => {
  it('shows Vietnamese class settings with Monday through Saturday selected', () => {
    render(<ClassroomSetupForm onSubmit={vi.fn()} />);
    expect(screen.getByLabelText('Tên lớp')).toHaveValue('10C8');
    expect(screen.getByLabelText('Thứ Hai')).toBeChecked();
    expect(screen.getByLabelText('Thứ Bảy')).toBeChecked();
    expect(screen.getByLabelText('Chủ Nhật')).not.toBeChecked();
  });
});
