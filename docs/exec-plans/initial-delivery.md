# ExecPlan: Lớp Sạch initial delivery

## Trạng thái

- Bắt đầu: 2026-08-27
- Nhánh: `main`
- Milestone hiện tại: 2.5 — Deployment topology spike
- Production topology: `DEFERRED_EXTERNAL_CREDENTIALS`

## Milestones

| Milestone | Trạng thái | Commit | Validation |
|---|---|---|---|
| 0. Repository foundation | Hoàn tất | `chore(repo): establish repository foundation` | `pnpm check` xanh |
| 1. Contracts/date-only | Hoàn tất | `feat(contracts): define shared duty scheduling contracts` | 5 tests xanh; typecheck/lint xanh |
| 2. Auth/migrations/login shell | Hoàn tất | `feat(auth): add secure sessions and deployment-ready login` | 20 tests xanh; full `pnpm check` xanh |
| 2.5. Deployment topology spike | Đang thực hiện | Chưa có | `DEFERRED_EXTERNAL_CREDENTIALS` cho smoke thật |
| 3. Master-data API | Chưa bắt đầu | Chưa có | Chưa chạy |
| 4. Master-data UI | Chưa bắt đầu | Chưa có | Chưa chạy |
| 5. Scheduler core/hash | Chưa bắt đầu | Chưa có | Chưa chạy |
| 6. Fairness/replacements | Chưa bắt đầu | Chưa có | Chưa chạy |
| 7. Duty-week lifecycle | Chưa bắt đầu | Chưa có | Chưa chạy |
| 8. Weekly UI | Chưa bắt đầu | Chưa có | Chưa chạy |
| 9. History/export/backup | Chưa bắt đầu | Chưa có | Chưa chạy |
| 10. PWA/offline | Chưa bắt đầu | Chưa có | Chưa chạy |
| 11. Quality/docs | Chưa bắt đầu | Chưa có | Chưa chạy |
| 12. Production deployment | Bị chặn ngoài repo | Chưa có | Chưa chạy |

## Quyết định

- Vercel project dùng repository root; build web bằng workspace filter.
- Cookie production và local HTTP có tên/flags khác nhau.
- Scheduler input dùng canonical SHA-256; FNV-1a chỉ tie-breaking.
- Database indexes dùng forward-only migrations.
- Availability có một nguồn: absence theo tuần hoặc ba loại restriction bền vững.
- Fairness baseline giữ tối đa tám eligible completed weeks.

## Discoveries

- Repository ban đầu chỉ có README UTF-16 LE.
- Node 24 và Corepack đã có; pnpm cần kích hoạt.
- Không có user changes cần bảo tồn ở thời điểm bắt đầu.

## Validation results

- Milestone 0: `pnpm check:text`, lint, typecheck, tests và builds đều xanh trên Node 24.15.0/pnpm 10.15.1.
- Milestone 1: date-only và availability contracts có 5 tests xanh; full `pnpm check` xanh.
- Milestone 2: proxy fixed-upstream có 6 unit tests; API auth/cookie/health/migration có 8 integration tests trên MongoDB replica set; web login shell có 1 component test; 5 contract tests hồi quy; full `pnpm check` xanh. Cookie development dùng `lop_sach_session` không Secure; cookie production dùng `__Host-lop_sach_session` với Secure/HttpOnly/SameSite=Lax/Path=/ và không Domain. Migrations idempotent, không tự drop index và từ chối cùng index name với specification khác.

## Remaining work

Thực hiện tuần tự toàn bộ milestones, cập nhật phần này sau mỗi gate.

## Known issues

- Chưa có Vercel, VPS, DNS, Atlas và GitHub deployment credentials; production topology giữ trạng thái `DEFERRED_EXTERNAL_CREDENTIALS`, chỉ ảnh hưởng smoke/deployment thật.
