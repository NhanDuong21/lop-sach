# ExecPlan: Startup and navigation performance

## Mục tiêu

Giảm thời gian từ lúc mở hoặc đăng nhập tới khi thấy giao diện có ích trên production, không thay đổi mô hình cookie, quyền truy cập, offline read-only hoặc business rules.

## Baseline production — 2026-08-29

- Navigation HTML/PWA cache hoàn tất trong khoảng 75 ms.
- `GET /api/v1/auth/me` có cookie mất 1.222 giây ở lần reload đo được.
- `GET /api/v1/classroom` chỉ bắt đầu sau auth và mất thêm 736 ms; app shell xuất hiện ở khoảng 2.038 giây.
- Hai request tuần trực bắt đầu sau classroom và hoàn tất ở khoảng 2.788/3.282 giây.
- Request không xác thực qua Vercel proxy ổn định quanh 651–670 ms, trong khi health/readiness trực tiếp tại API quanh 43–108 ms.
- `X-Vercel-Id` cho thấy ingress `hkg1` nhưng function chạy ở `iad1`.
- Bundle production hiện tại là 520,624 byte chưa nén, khoảng 156,009 byte qua mạng khi nén.

## Bất biến

- Cookie vẫn là HttpOnly, Secure, SameSite=Lax, host-only và không được đưa vào localStorage.
- API vẫn cùng origin qua fixed upstream proxy và giữ origin/proxy-secret guards.
- UI tiếng Việt, light mode; offline chỉ đọc và không cache API.
- Endpoint cũ `/auth/me` được giữ tương thích cho smoke và client đang mở trong lúc rolling deploy.
- Scheduler, dữ liệu lớp và lifecycle tuần không đổi.

## Kế hoạch

- [x] Đo baseline và xác định proxy region + request waterfall.
- [x] Ghim Vercel function tại `hkg1`.
- [x] Thêm bootstrap contract/API trả user và classroom trong một request.
- [x] Dùng kết quả login để hydrate query cache, không gọi lại `/auth/me`.
- [x] Thay full-page auth loader bằng app-shell skeleton có nội dung ngay.
- [x] Gộp hai request current-week/draft thành một overview request.
- [x] Tách route bundle và preload route hiện tại song song với bootstrap.
- [x] Bổ sung regression tests và cập nhật topology smoke.
- [x] Chạy `pnpm check`, E2E, audit production và text policy.
- [x] Chạy diff check cuối sau khi chốt tài liệu production.
- [x] Commit, push, theo dõi deploy API/Vercel và đo lại production.

## Quyết định

- Dùng một primary Vercel region `hkg1`; Hobby hỗ trợ một region và static assets vẫn ở CDN toàn cầu.
- Thêm `/api/v1/auth/bootstrap` thay vì phá response của `/auth/me`.
- Login response được mở rộng tương thích bằng trường `classroom`; các trường user cũ giữ nguyên.
- Current-week overview dùng một HTTP request nhưng vẫn chạy các truy vấn MongoDB cần thiết song song trên VPS.

## Kết quả

Local validation đã xanh với 107 tests trong `pnpm check`, Playwright E2E 3/3 và `pnpm audit:prod` không có vulnerability đã biết. Main startup chunk giảm từ 520,624 byte (gzip 156,009 byte) xuống 384,430 byte (gzip 119,600 byte); route hiện tại là chunk riêng 10,900 byte (gzip 3,670 byte).

Implementation commit `992110f` đã lên `origin/main`. CI run `33238366519` và production deploy run `33238380208` đều xanh; API readiness trả `ready`. Production HTML trỏ đúng chunk mới `index-C5tMq8y2.js`, còn `X-Vercel-Id` đổi từ `hkg1::iad1` sang `hkg1::hkg1`.

Năm request bootstrap không xác thực qua public proxy mất 270–479 ms, trung vị 277 ms, thay cho baseline 651–670 ms. Với phiên thật trong browser, ba reload hoàn chỉnh cho kết quả:

- authenticated app shell xuất hiện khi bootstrap hoàn tất ở 308–533 ms, trung vị 348 ms, thay cho khoảng 2.038 giây;
- nội dung tuần hoàn tất ở 902–1.152 ms, trung vị 958 ms, thay cho 2.788–3.282 giây;
- waterfall chỉ có `/auth/bootstrap` rồi `/duty-weeks/overview`; không còn `/auth/me` → `/classroom` → hai list tuần nối tiếp;
- bootstrap trả `200`, user + classroom và `Cache-Control: no-store`; viewport mobile 390 × 844 có `scrollWidth = innerWidth = 390`;
- service worker cũ hiển thị đúng notice cập nhật, action `Cập nhật` kích hoạt bundle mới, và shell skeleton xuất hiện ngay trong lúc bootstrap đang chờ.
