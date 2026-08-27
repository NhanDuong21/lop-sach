# ADR 0005: Vercel same-origin proxy

Vercel project chạy từ repository root. Root function chỉ proxy `/api/v1` tới một HTTPS upstream cố định, bảo toàn cookies và áp dụng body/timeout/header guards.
