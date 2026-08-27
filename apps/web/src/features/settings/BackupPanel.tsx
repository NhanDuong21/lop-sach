import {
  BackupEnvelopeSchema,
  type BackupEnvelope,
  type BackupValidationResult,
} from '@lop-sach/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { Download, RotateCcw, Upload } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../lib/api-client.js';
import { Notice } from '../../components/ui/Notice.js';

const MAX_BACKUP_BYTES = 2 * 1024 * 1024;

async function exportBackup(): Promise<BackupEnvelope> {
  return (await apiRequest<{ data: BackupEnvelope }>('/backup/export')).data;
}

async function validateBackup(backup: BackupEnvelope): Promise<BackupValidationResult> {
  return (
    await apiRequest<{ data: BackupValidationResult }>('/backup/validate', {
      method: 'POST',
      body: JSON.stringify({ backup }),
    })
  ).data;
}

async function restoreBackup(
  backup: BackupEnvelope,
  confirmedDigest: string,
): Promise<BackupValidationResult> {
  return (
    await apiRequest<{ data: BackupValidationResult }>('/backup/restore', {
      method: 'POST',
      body: JSON.stringify({ backup, confirmedDigest }),
    })
  ).data;
}

function downloadBackup(backup: BackupEnvelope): void {
  const blob = new Blob([`${JSON.stringify(backup, null, 2)}\n`], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `lop-sach-sao-luu-${backup.exportedAt.slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function BackupPanel(): React.JSX.Element {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [backup, setBackup] = useState<BackupEnvelope | null>(null);
  const [validation, setValidation] = useState<BackupValidationResult | null>(null);
  const [preRestoreExported, setPreRestoreExported] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const performExport = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const exported = await exportBackup();
      downloadBackup(exported);
      setPreRestoreExported(true);
      setMessage('Đã tải bản sao lưu. Hãy cất tệp ở nơi an toàn.');
    } catch {
      setError('Không thể xuất bản sao lúc này.');
    } finally {
      setBusy(false);
    }
  };

  const selectFile = async (file: File | undefined): Promise<void> => {
    setValidation(null);
    setBackup(null);
    setConfirmation('');
    setMessage(null);
    setError(null);
    setSelectedFile(file ?? null);
    if (!file) return;
    if (file.size > MAX_BACKUP_BYTES) {
      setError('Tệp sao lưu vượt quá giới hạn 2 MB.');
      return;
    }
    setBusy(true);
    try {
      const parsed = BackupEnvelopeSchema.parse(JSON.parse(await file.text()) as unknown);
      const result = await validateBackup(parsed);
      setBackup(parsed);
      setValidation(result);
      setMessage('Bản sao lưu hợp lệ. Kiểm tra thông tin trước khi phục hồi.');
    } catch {
      setError('Tệp không phải bản sao lưu Lớp Sạch hợp lệ hoặc không tương thích.');
    } finally {
      setBusy(false);
    }
  };

  const performRestore = async (): Promise<void> => {
    if (!backup || !validation || !preRestoreExported || confirmation !== 'PHỤC HỒI') return;
    setBusy(true);
    setError(null);
    try {
      await restoreBackup(backup, validation.digest);
      queryClient.clear();
      void navigate(0);
    } catch {
      setError('Phục hồi không thành công. Dữ liệu hiện tại không bị thay đổi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card backup-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">An toàn dữ liệu</p>
          <h2>Sao lưu và phục hồi</h2>
        </div>
        <button
          className="button button-secondary"
          type="button"
          disabled={busy}
          onClick={() => void performExport()}
        >
          <Download size={17} aria-hidden="true" /> Tải bản sao lưu
        </button>
      </div>
      <p className="muted">
        Bản sao chỉ chứa dữ liệu lớp; không có tài khoản, mật khẩu, phiên đăng nhập hoặc dữ liệu bí
        mật.
      </p>
      {message ? <Notice tone="success">{message}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      <label className="file-picker">
        <span className="button button-secondary">
          <Upload size={17} aria-hidden="true" /> Chọn tệp sao lưu
        </span>
        <input
          aria-label="Tệp sao lưu"
          type="file"
          accept="application/json,.json"
          disabled={busy}
          onChange={(event) => void selectFile(event.target.files?.[0])}
        />
        <span className="file-picker-name">
          {selectedFile
            ? `${selectedFile.name} · ${(selectedFile.size / 1024).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} KB`
            : 'Chưa chọn tệp nào'}
        </span>
      </label>
      {validation ? (
        <div className="backup-validation">
          <strong>{validation.classroomName}</strong>
          <span>
            {validation.studentCount} học sinh · {validation.taskTemplateCount} công việc ·{' '}
            {validation.dutyWeekCount} tuần
          </span>
          <span>Xuất lúc {new Date(validation.exportedAt).toLocaleString('vi-VN')}</span>
          {!preRestoreExported ? (
            <Notice tone="warning">Hãy tải bản sao lưu dữ liệu hiện tại trước khi phục hồi.</Notice>
          ) : null}
          <label htmlFor="restore-confirmation">
            Nhập <strong>PHỤC HỒI</strong> để xác nhận thay thế toàn bộ dữ liệu lớp
          </label>
          <input
            id="restore-confirmation"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
          />
          <button
            className="button danger"
            type="button"
            disabled={busy || !preRestoreExported || confirmation !== 'PHỤC HỒI'}
            onClick={() => void performRestore()}
          >
            <RotateCcw size={17} aria-hidden="true" /> Phục hồi bản sao đã kiểm tra
          </button>
        </div>
      ) : null}
    </section>
  );
}
