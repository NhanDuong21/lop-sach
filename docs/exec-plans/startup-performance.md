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
- [ ] Chạy diff check cuối sau khi chốt tài liệu production.
- [ ] Commit, push, theo dõi deploy API/Vercel và đo lại production.

## Quyết định

- Dùng một primary Vercel region `hkg1`; Hobby hỗ trợ một region và static assets vẫn ở CDN toàn cầu.
- Thêm `/api/v1/auth/bootstrap` thay vì phá response của `/auth/me`.
- Login response được mở rộng tương thích bằng trường `classroom`; các trường user cũ giữ nguyên.
- Current-week overview dùng một HTTP request nhưng vẫn chạy các truy vấn MongoDB cần thiết song song trên VPS.

## Kết quả

Local validation đã xanh với 107 tests trong `pnpm check`, Playwright E2E 3/3 và `pnpm audit:prod` không có vulnerability đã biết. Main startup chunk giảm từ 520,624 byte (gzip 156,009 byte) xuống 384,430 byte (gzip 119,600 byte); route hiện tại là chunk riêng 10,900 byte (gzip 3,670 byte). Còn deploy và timing production.
