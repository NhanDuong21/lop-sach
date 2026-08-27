# Lớp Sạch

Lớp Sạch là PWA tiếng Việt giúp lớp phó lao động phân công trực nhật công bằng, có thể giải thích và vẫn giữ quyền kiểm soát thủ công. Bản phát hành đầu tiên phục vụ một tài khoản vận hành và một lớp học, mặc định là 10C8.

## Kiến trúc

- `apps/web`: React/Vite PWA, mobile-first.
- `apps/api`: Express/Mongoose modular monolith.
- `packages/contracts`: contracts Zod và kiểu dữ liệu dùng chung.
- `packages/scheduler`: bộ lập lịch TypeScript thuần, deterministic.

## Yêu cầu

- Node.js 24
- Corepack
- MongoDB Atlas hoặc MongoDB tương thích cho phát triển

## Thiết lập

```bash
corepack enable
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm dev
```

Không commit file `.env` hoặc bất kỳ secret nào.

API development dùng cookie `lop_sach_session` không có cờ `Secure` trên HTTP local. Production dùng riêng cookie `__Host-lop_sach_session` với `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/` và không đặt `Domain`.

## Kiểm tra

```bash
pnpm check:text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check
pnpm exec playwright install chromium
pnpm test:e2e
pnpm audit:prod
```

`pnpm check` gồm text policy, format, lint, typecheck, unit/integration tests, production builds và API runtime import. E2E khởi động API thật với MongoDB replica set tạm thời, chạy weekly workflow, lịch không thể xếp đủ, accessibility, responsive 360 px và PWA offline. Production-topology test là gate riêng, chỉ chạy khi có URL và credentials thật.

## Triển khai

- Import Vercel từ repository root; build bằng `pnpm --filter @lop-sach/web build`, output `apps/web/dist`.
- API chạy một process sau Nginx trên VPS; database nằm tại MongoDB Atlas.
- Migration chỉ tiến về trước và phải chạy thành công trước khi đổi active release.
- Workflow `Deploy API` chỉ chạy thủ công qua GitHub environment được bảo vệ.

Quy trình Vercel, VPS, Atlas Free pause/resume, backup kỳ nghỉ, rollback và topology smoke nằm trong [docs/deployment.md](docs/deployment.md). Trạng thái triển khai thực được ghi ở [living ExecPlan](docs/exec-plans/initial-delivery.md).

## Dữ liệu và quyền riêng tư

Ứng dụng chỉ lưu dữ liệu cần cho việc trực nhật. Backup JSON không chứa password hash, session hoặc server secret. Vắng mặt theo ngày được lưu trong tuần trực; không dùng ứng dụng như hệ thống điểm danh chung.
