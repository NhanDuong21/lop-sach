import { useQuery } from '@tanstack/react-query';
import { Download, Share2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LoadingState } from '../../components/ui/LoadingState.js';
import { Notice } from '../../components/ui/Notice.js';
import { WeekSummary } from '../current-week/WeekSummary.js';
import { getClassroom } from '../classroom/classroom.api.js';
import { getDutyWeek } from '../duty-weeks/duty-weeks.api.js';
import { downloadBlob, dutyWeekPng } from '../../lib/export-png.js';
import { downloadTextFile, dutyWeekText, sanitizedExportFilename } from '../../lib/export-text.js';

export function HistoryDetailPage(): React.JSX.Element {
  const { weekId = '' } = useParams();
  const week = useQuery({ queryKey: ['duty-week', weekId], queryFn: () => getDutyWeek(weekId) });
  const classroom = useQuery({ queryKey: ['classroom'], queryFn: getClassroom });
  const [exportError, setExportError] = useState<string | null>(null);
  if (week.isPending || classroom.isPending) return <LoadingState label="Đang tải snapshot tuần" />;
  if (!week.data || !classroom.data)
    return <Notice tone="error">Không tải được tuần lịch sử này.</Notice>;
  const filename = `lop-sach-${sanitizedExportFilename(classroom.data.name)}-${week.data.weekStart}`;
  const exportPng = async (share: boolean): Promise<void> => {
    setExportError(null);
    try {
      const blob = await dutyWeekPng(week.data, classroom.data.name);
      const file = new File([blob], `${filename}.png`, { type: 'image/png' });
      if (
        share &&
        navigator.share &&
        (!navigator.canShare || navigator.canShare({ files: [file] }))
      ) {
        await navigator.share({ title: 'Lịch trực Lớp Sạch', files: [file] });
      } else downloadBlob(blob, file.name);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError'))
        setExportError('Không thể tạo hoặc chia sẻ tệp PNG trên thiết bị này.');
    }
  };
  return (
    <div className="page-stack">
      <header className="page-heading">
        <p className="eyebrow">Snapshot đã hoàn tất</p>
        <h1>Tuần {week.data.weekStart}</h1>
        <p>
          {week.data.groupSnapshot.name} · Bản phát hành {week.data.publicationRevision}
        </p>
        <div className="button-row">
          <button
            className="button secondary"
            type="button"
            onClick={() =>
              downloadTextFile(dutyWeekText(week.data, classroom.data.name), `${filename}.txt`)
            }
          >
            <Download size={17} aria-hidden="true" /> Xuất văn bản
          </button>
          <button className="button secondary" type="button" onClick={() => void exportPng(false)}>
            <Download size={17} aria-hidden="true" /> Xuất PNG
          </button>
          <button className="button" type="button" onClick={() => void exportPng(true)}>
            <Share2 size={17} aria-hidden="true" /> Chia sẻ
          </button>
        </div>
      </header>
      {exportError ? <Notice tone="error">{exportError}</Notice> : null}
      {week.data.completionLedger.some((entry) => entry.usedAssignedPerformerFallback) ? (
        <Notice tone="warning">
          Một số lượt dùng người được phân công làm dữ liệu thực tế do chưa ghi người thay.
        </Notice>
      ) : null}
      <section className="card">
        <WeekSummary week={week.data} />
      </section>
      <section className="card compact-history">
        <h2>Lịch sử thay đổi</h2>
        <p>
          {week.data.changeLogSummary.totalCompacted} thay đổi cũ đã được rút gọn; còn{' '}
          {week.data.changeLog.length} mục chi tiết gần nhất.
        </p>
      </section>
      <Link className="text-link" to="/history">
        Quay lại lịch sử
      </Link>
    </div>
  );
}
