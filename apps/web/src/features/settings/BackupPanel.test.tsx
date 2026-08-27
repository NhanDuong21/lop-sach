import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest } from '../../lib/api-client.js';
import { BackupPanel } from './BackupPanel.js';

vi.mock('../../lib/api-client.js', () => ({ apiRequest: vi.fn() }));

const backup = {
  schemaVersion: 1 as const,
  product: 'Lớp Sạch' as const,
  productVersion: '0.1.0',
  exportedAt: '2026-08-27T08:00:00.000Z',
  classroom: {
    id: '68a000000000000000000001',
    name: '10C8',
    schoolYear: '2026-2027',
    timezone: 'Asia/Ho_Chi_Minh' as const,
    schoolDays: ['MONDAY'] as const,
    groups: [{ id: 'group-1', name: 'Tổ 1', order: 0, active: true }],
    onboarding: { currentStep: 6, completedAt: '2026-08-20T08:00:00.000Z' },
    revisionCounters: { classroom: 1, students: 0, tasks: 0 },
    dataRevision: 1,
    version: 0,
  },
  students: [],
  taskTemplates: [],
  dutyWeeks: [],
};

describe('BackupPanel', () => {
  beforeEach(() => {
    vi.mocked(apiRequest).mockImplementation((path) => {
      if (path === '/backup/export') return Promise.resolve({ data: backup });
      if (path === '/backup/validate')
        return Promise.resolve({
          data: {
            digest: 'a'.repeat(64),
            schemaVersion: 1,
            productVersion: '0.1.0',
            exportedAt: backup.exportedAt,
            classroomName: '10C8',
            studentCount: 0,
            taskTemplateCount: 0,
            dutyWeekCount: 0,
          },
        });
      throw new Error(`Unexpected request: ${path}`);
    });
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:test'),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  });

  it('requires a pre-restore export and explicit confirmation after server validation', async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <BackupPanel />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    const file = new File([JSON.stringify(backup)], 'backup.json', { type: 'application/json' });
    Object.defineProperty(file, 'text', { value: () => Promise.resolve(JSON.stringify(backup)) });
    fireEvent.change(screen.getByLabelText('Tệp sao lưu'), { target: { files: [file] } });
    await screen.findByText(/Bản sao lưu hợp lệ/u);
    const restore = screen.getByRole('button', { name: 'Phục hồi bản sao đã kiểm tra' });
    expect(restore).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Xuất bản sao hiện tại' }));
    await waitFor(() => expect(screen.getByText(/cất tệp ở nơi an toàn/u)).toBeVisible());
    await user.type(screen.getByLabelText(/Nhập PHỤC HỒI/u), 'PHỤC HỒI');
    expect(restore).toBeEnabled();
  });
});
