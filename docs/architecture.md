# Architecture

Hệ thống là TypeScript modular monolith gồm React PWA, Express API, shared contracts và pure scheduler. Vercel phục vụ web từ repository root và proxy `/api/v1` tới Nginx/VPS. API dùng MongoDB Atlas.

Backend là nguồn canonical: web có thể preview nhưng API rebuild scheduler context, xác nhận SHA-256 hash/version và tự chạy engine trước khi lưu. Duty-week giữ snapshots/compact fairness baseline để history không đổi khi master data thay đổi.

Authentication dùng opaque session cookie. API production chỉ nhận route ứng dụng qua fixed Vercel proxy có shared secret, exact Origin validation và explicit trust-proxy chain.

Production proxy chain có đúng hai tầng trung gian: Vercel function sanitize client IP và gắn proxy secret; Nginx là hop trực tiếp duy nhất được Express tin cậy (`trust proxy = 1`). Nginx ghi đè forwarding headers trước khi chuyển vào API bind loopback. Health routes không cần secret nhưng không trả chi tiết dependency; route ứng dụng cần secret trước rate limit/auth.

PWA chỉ cache app shell; current-week display DTO được lưu IndexedDB để đọc offline. Không có offline synchronization queue.

Vercel project được cấu hình từ repository root bằng `vercel.json`; function `api/[...path].ts` và các workspace package được build từ cùng root, không phụ thuộc dashboard-only root setting. Static output là `apps/web/dist`.

Domain tuần trực chỉ có ngày `YYYY-MM-DD`, không có start/end time hoặc time bucket. Availability có một nguồn: vắng một ngày nằm tại duty-week; student chỉ có `NO_HEAVY_TASKS`, `TASK_EXCLUSION` và `EXEMPT_DATE_RANGE`. Nhiều assignment cùng ngày là soft constraint có warning, không phải hard overlap.

Database schema/index chỉ thay đổi qua forward-only migration có ID/checksum trong `schemaMigrations`. Release mới chạy migration khi còn inactive; migration lỗi không được đổi active symlink và không có automatic down migration.
