import type { DutyWeek } from '@lop-sach/contracts';
import { Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button.js';
import { Notice } from '../../components/ui/Notice.js';
import { downloadBlob, dutyWeekPng } from '../../lib/export-png.js';
import { sanitizedExportFilename } from '../../lib/export-text.js';

type Feedback = { readonly tone: 'success' | 'error'; readonly text: string };

export function DraftWeekTableExport({
  week,
  classroomName,
}: {
  readonly week: DutyWeek;
  readonly classroomName: string;
}): React.JSX.Element {
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const filename = useMemo(
    () => `lop-sach-${sanitizedExportFilename(classroomName)}-${week.weekStart}-ban-nhap.png`,
    [classroomName, week.weekStart],
  );

  const downloadTable = async (): Promise<void> => {
    setFeedback(null);
    setPending(true);
    try {
      downloadBlob(await dutyWeekPng(week, classroomName), filename);
      setFeedback({ tone: 'success', text: `Đã tải ${filename}.` });
    } catch {
      setFeedback({
        tone: 'error',
        text: 'Không thể tạo bảng PNG trên thiết bị này. Hãy thử lại bằng trình duyệt khác.',
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="card draft-table-export" aria-label="Xem bản nháp dạng bảng">
      <div>
        <p className="eyebrow">Rà soát nhanh</p>
        <h2>Xem toàn bộ dạng bảng</h2>
        <p>
          Tải ảnh PNG để đối chiếu ngày, công việc và người được phân công mà không phải cuộn từng
          thẻ. Ảnh có nhãn bản nháp và chưa phải lịch đã công bố.
        </p>
      </div>
      <Button variant="secondary" disabled={pending} onClick={() => void downloadTable()}>
        <Download size={17} aria-hidden="true" />
        {pending ? 'Đang tạo bảng…' : 'Tải bảng PNG'}
      </Button>
      {feedback ? <Notice tone={feedback.tone}>{feedback.text}</Notice> : null}
    </section>
  );
}
