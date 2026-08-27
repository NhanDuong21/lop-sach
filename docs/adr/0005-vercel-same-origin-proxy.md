# ADR 0005: Vercel same-origin proxy

Vercel project chạy từ repository root. Root function chỉ proxy `/api/v1` tới một HTTPS upstream cố định, bảo toàn cookies và áp dụng body/timeout/header guards.

## Decision

- Build command là `pnpm --filter @lop-sach/web build`; output là `apps/web/dist`.
- Function không đọc upstream từ path, query hoặc client header. Production config từ chối upstream không phải HTTPS origin thuần.
- Request chỉ forward allowlisted headers và client IP do Vercel cung cấp sau validation; không forward Authorization/hop-by-hop headers.
- Response luôn `no-store` và giữ từng `Set-Cookie` riêng.
- Vercel và Express không log cookie, credential hoặc login body.
- API production yêu cầu shared proxy secret. Express tin đúng một Nginx hop, không dùng `trust proxy=true`.

## Consequences

Web có cookie first-party và không cần CORS credential flow. Vercel function là security boundary phải có unit tests và production topology smoke. Preview deployment không tự dùng production API; topology chỉ được coi là verified sau smoke qua host thật.
