import { History } from 'lucide-react';

export function HistoryPage(): React.JSX.Element {
  return <div className="page-stack"><header className="page-heading"><p className="eyebrow">Theo dõi</p><h1>Lịch sử trực nhật</h1><p>Các tuần hoàn tất sẽ giữ snapshot để không đổi khi sửa dữ liệu lớp.</p></header><section className="card empty-state"><History size={30} aria-hidden="true" /><h2>Chưa có tuần đã hoàn tất</h2><p>Sau khi một tuần được hoàn tất, kết quả thực tế sẽ xuất hiện tại đây.</p></section></div>;
}
