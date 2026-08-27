# Architecture

Hệ thống là TypeScript modular monolith gồm React PWA, Express API, shared contracts và pure scheduler. Vercel phục vụ web từ repository root và proxy `/api/v1` tới Nginx/VPS. API dùng MongoDB Atlas.

Backend là nguồn canonical: web có thể preview nhưng API rebuild scheduler context, xác nhận SHA-256 hash/version và tự chạy engine trước khi lưu. Duty-week giữ snapshots/compact fairness baseline để history không đổi khi master data thay đổi.

Authentication dùng opaque session cookie. API production chỉ nhận route ứng dụng qua fixed Vercel proxy có shared secret, exact Origin validation và explicit trust-proxy chain.

PWA chỉ cache app shell; current-week display DTO được lưu IndexedDB để đọc offline. Không có offline synchronization queue.
