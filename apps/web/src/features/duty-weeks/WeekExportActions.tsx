import type { DutyWeek } from '@lop-sach/contracts';
import { Copy, Download, Share2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Notice } from '../../components/ui/Notice.js';
import { downloadBlob, dutyWeekPng } from '../../lib/export-png.js';
import { downloadTextFile, dutyWeekText, sanitizedExportFilename } from '../../lib/export-text.js';

type Feedback = { readonly tone: 'success' | 'error' | 'info'; readonly text: string };

export function WeekExportActions({
  week,
  classroomName,
}: {
  readonly week: DutyWeek;
  readonly classroomName: string;
}): React.JSX.Element {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pending, setPending] = useState(false);
  const filename = useMemo(
    () => `lop-sach-${sanitizedExportFilename(classroomName)}-${week.weekStart}`,
    [classroomName, week.weekStart],
  );
  const text = useMemo(() => dutyWeekText(week, classroomName), [classroomName, week]);

  const copyText = async (): Promise<void> => {
    setFeedback(null);
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error('Trình duyệt không hỗ trợ sao chép tự động.');
      await navigator.clipboard.writeText(text);
      setFeedback({ tone: 'success', text: 'Đã sao chép lịch tiếng Việt vào bộ nhớ tạm.' });
    } catch {
      setFeedback({
        tone: 'error',
        text: 'Không thể sao chép tự động trên trình duyệt này. Bạn vẫn có thể tải ảnh PNG.',
      });
    }
  };

  const exportPng = async (share: boolean): Promise<void> => {
    setFeedback(null);
    setPending(true);
    try {
      const blob = await dutyWeekPng(week, classroomName);
      const file = new File([blob], `${filename}.png`, { type: 'image/png' });
      if (
        share &&
        navigator.share &&
        (!navigator.canShare || navigator.canShare({ files: [file] }))
      ) {
        await navigator.share({ title: 'Lịch trực Lớp Sạch', files: [file] });
        setFeedback({ tone: 'success', text: 'Đã chia sẻ tệp PNG.' });
      } else {
        downloadBlob(blob, file.name);
        setFeedback({ tone: 'success', text: `Đã tải ${file.name}.` });
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError')
        setFeedback({ tone: 'info', text: 'Đã hủy chia sẻ.' });
      else
        setFeedback({
          tone: 'error',
          text: 'Không thể tạo hoặc chia sẻ tệp PNG trên thiết bị này.',
        });
    } finally {
      setPending(false);
    }
  };

  return (
    <section id="share" className="card export-actions" aria-label="Chia sẻ lịch với lớp">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Gửi lịch cho lớp</p>
          <h2>Chia sẻ lịch</h2>
          <p>Gửi ảnh trực tiếp trên điện thoại, hoặc sao chép nội dung cho nhóm lớp.</p>
        </div>
        <button
          className="button"
          type="button"
          disabled={pending}
          onClick={() => void exportPng(true)}
        >
          <Share2 size={17} aria-hidden="true" /> Chia sẻ lịch
        </button>
      </div>
      <div className="button-row">
        <button className="button button-secondary" type="button" onClick={() => void copyText()}>
          <Copy size={17} aria-hidden="true" /> Sao chép nội dung
        </button>
        <button
          className="button button-secondary"
          type="button"
          disabled={pending}
          onClick={() => void exportPng(false)}
        >
          <Download size={17} aria-hidden="true" /> Tải ảnh PNG
        </button>
        <details className="export-more">
          <summary>Tùy chọn khác</summary>
          <button
            className="text-action"
            type="button"
            onClick={() => {
              downloadTextFile(text, `${filename}.txt`);
              setFeedback({ tone: 'success', text: `Đã tải ${filename}.txt.` });
            }}
          >
            Tải tệp văn bản (.txt)
          </button>
        </details>
      </div>
      {feedback ? <Notice tone={feedback.tone}>{feedback.text}</Notice> : null}
    </section>
  );
}
