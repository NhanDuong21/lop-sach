# ExecPlan: Public PWA install landing

## Mục tiêu

Thêm public route `/install` để giới thiệu ngắn gọn Lớp Sạch, cài PWA đúng theo khả năng của trình duyệt và chia sẻ canonical install URL bằng native share/copy/QR thật. Landing không gọi auth bootstrap, không dùng app shell và khi chạy standalone phải đi thẳng vào app entry `/`.

## Bất biến

- Manifest tiếp tục khởi động ở `/`, không đổi identity PWA và không lưu cờ installed vào local storage.
- Listener `beforeinstallprompt` được đăng ký trước React render; mỗi deferred prompt chỉ dùng một lần.
- iPhone/iPad và browser tích hợp chỉ nhận hướng dẫn phù hợp, không giả native prompt hoặc deep link sang browser khác.
- QR mã hóa URL `/install` trên origin hiện tại và giữ query parameters dùng để chia sẻ.
- Asset trong `public/landing` chỉ được sử dụng, không chỉnh sửa hoặc generate lại.
- Landing không làm thay đổi login, auth guard, scheduler hoặc API.

## Kế hoạch và tiến độ

- [x] Audit router, auth bootstrap, service worker, manifest, metadata, Vite base và Vercel rewrite.
- [x] Tách `/install` thành public lazy route không render app shell và không gọi auth bootstrap.
- [x] Thêm install controller, standalone/iOS/in-app detection, accessible fallback dialog và session install state.
- [x] Dựng desktop hero hai cột với HTML/CSS phone preview, QR thật và share/copy.
- [x] Dựng mobile hero, hướng dẫn Android/iOS, mascot quote, footer và safe-area handling.
- [x] Giữ landing assets ngoài app-shell precache để không làm service worker tải nền nhiều megabyte.
- [x] Thêm unit/component/E2E cho platform, URL, share, public route, prompt, standalone redirect, QR và responsive.
- [x] Chạy full repository gates và E2E cuối trên code chính xác.
- [x] Hoàn tất browser matrix, ảnh desktop/mobile và vòng visual refinement.

## Quyết định

`react-qr-code` được dùng làm dependency nhỏ duy nhất vì repository chưa có QR encoder. Phone preview là markup tĩnh không focus được; mobile không render phone/QR lớn. `ModalDialog` hiện có được mở rộng bằng `className` để dùng lại focus trap, Escape, scroll lock và focus restoration cho bottom sheet cài đặt.

## Validation

- `pnpm check` xanh với 121 unit/integration tests, production build và API runtime import.
- Playwright 4/4 xanh, gồm install prompt một lần, standalone redirect, fallback guide, QR/share, direct reload, PWA precache và luồng sản phẩm hiện có.
- `pnpm audit:prod` không có vulnerability đã biết.
- Browser smoke không tràn ngang tại desktop 1280 × 800, 1366 × 768, 1440 × 900; tablet 768 × 1024, 820 × 1180; mobile 320 × 700, 360 × 800, 375 × 812, 390 × 844 và 430 × 932.
- Vòng refinement cuối đưa logo mobile lên trên tên thương hiệu, cố định headline thành hai dòng và giữ CTA chính cao 56 px; bottom sheet giữ focus trap, Escape, khóa cuộn và phục hồi focus.
- Commit `e49362d` đã lên `origin/main`; CI `33244560566` và Vercel deployment `GhUN3FPUTcejToBUVcMJx18j2Gu9` đều xanh.
- Production Browser smoke xác nhận service worker cũ hiện đúng thông báo cập nhật, kích hoạt bản mới thành công, `/install?class=10c8` giữ route/query, QR mã hóa đúng URL production và desktop/mobile không tràn ngang hoặc lỗi asset/console.
- API không đổi nên không chạy workflow `Deploy API`; live/ready vẫn lần lượt trả `ok`/`ready`, còn auth proxy chưa có phiên trả `401` với `Cache-Control: no-store`. Smoke không tạo, sửa hoặc xóa dữ liệu UAT.
