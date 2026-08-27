# Hướng dẫn làm việc

## Bố cục

- `apps/web`: UI React/PWA; không chứa business rules.
- `apps/api`: authentication, validation, persistence và orchestration.
- `packages/contracts`: Zod contracts và serialized types.
- `packages/scheduler`: scheduler TypeScript thuần, framework-independent.

## Lệnh chính

`pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm check`, `pnpm test:e2e`, `pnpm audit:prod`.

## Bất biến

- Ngày học dùng `YYYY-MM-DD`; không thêm start/end time hoặc time bucket.
- Vắng một ngày chỉ nằm trong duty-week absences.
- Hard constraints không bao giờ được relax.
- Backend luôn tái tạo và xác nhận scheduler output trước persistence.
- Thay đổi scheduler phải giữ determinism; thay đổi thuật toán production phải tăng engine version.
- Production indexes chỉ qua forward-only migrations; không dùng `syncIndexes()`.

## UI và bảo mật

- UI tiếng Việt, light mode, không emoji, gradient, glassmorphism hoặc raw IDs.
- Không lưu auth token trong localStorage.
- Không log cookie, password, login body, token hoặc URI có secret.
- Không commit `.env`, credentials hoặc backup thật.

## Definition of done

Milestone chỉ được commit sau khi text/format, test, lint, typecheck và build liên quan đều xanh. Milestone UI phải chạy E2E tương ứng; dependency production không được còn advisory high. Cập nhật `docs/exec-plans/initial-delivery.md` sau mỗi milestone. Significant changes phải có ExecPlan sống.
