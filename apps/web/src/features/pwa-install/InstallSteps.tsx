import { MoreVertical, Share2, Smartphone, TabletSmartphone } from 'lucide-react';

export function InstallSteps(): React.JSX.Element {
  return (
    <section className="install-guide-section" id="huong-dan" aria-labelledby="guide-title">
      <header className="install-section-heading">
        <span>Hướng dẫn nhanh</span>
        <h2 id="guide-title">Cài Lớp Sạch chỉ trong 1 phút</h2>
        <p>Chọn hướng dẫn đúng với thiết bị bạn đang dùng.</p>
      </header>
      <div className="install-guide-grid">
        <article className="install-guide-card">
          <div className="install-guide-card-icon" aria-hidden="true">
            <Smartphone size={30} />
          </div>
          <div>
            <h3>Dành cho Android</h3>
            <ol>
              <li>Mở liên kết bằng Chrome.</li>
              <li>Nhấn “Cài ứng dụng ngay” và chọn “Cài đặt” khi trình duyệt hỏi.</li>
              <li>
                Nếu không thấy hộp thoại, mở menu <MoreVertical size={16} aria-label="Ba chấm" />
                rồi chọn “Cài đặt ứng dụng” hoặc “Thêm vào màn hình chính”.
              </li>
            </ol>
          </div>
        </article>
        <article className="install-guide-card">
          <div className="install-guide-card-icon" aria-hidden="true">
            <TabletSmartphone size={30} />
          </div>
          <div>
            <h3>Dành cho iPhone và iPad</h3>
            <ol>
              <li>Mở liên kết bằng Safari.</li>
              <li>
                Nhấn nút <Share2 size={16} aria-label="Chia sẻ" /> Chia sẻ.
              </li>
              <li>
                Chọn “Thêm vào Màn hình chính”, bật “Mở dưới dạng ứng dụng web” nếu được hiển thị,
                rồi nhấn “Thêm”.
              </li>
            </ol>
          </div>
        </article>
      </div>
    </section>
  );
}
