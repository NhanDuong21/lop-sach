# ExecPlan: Lớp Sạch initial delivery

## Trạng thái

- Bắt đầu: 2026-08-27
- Nhánh: `main`
- Milestone hiện tại: 5 — Scheduler core/hash
- Production topology: `DEFERRED_EXTERNAL_CREDENTIALS`

## Milestones

| Milestone | Trạng thái | Commit | Validation |
|---|---|---|---|
| 0. Repository foundation | Hoàn tất | `chore(repo): establish repository foundation` | `pnpm check` xanh |
| 1. Contracts/date-only | Hoàn tất | `feat(contracts): define shared duty scheduling contracts` | 5 tests xanh; typecheck/lint xanh |
| 2. Auth/migrations/login shell | Hoàn tất | `feat(auth): add secure sessions and deployment-ready login` | 20 tests xanh; full `pnpm check` xanh |
| 2.5. Deployment topology spike | Hoàn tất phần repository | `chore(deploy): add verifiable production topology` | Repo gates xanh; production `DEFERRED_EXTERNAL_CREDENTIALS` |
| 3. Master-data API | Hoàn tất | `feat(classroom): add revisioned classroom master data` | 25 tests xanh; full `pnpm check` xanh |
| 4. Master-data UI | Hoàn tất | `feat(web): complete onboarding and classroom management` | 28 tests + API runtime import; full `pnpm check` xanh |
| 5. Scheduler core/hash | Đang thực hiện | Chưa có | Chưa chạy |
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
- Milestone 2.5: root Vercel config, Nginx/systemd templates, atomic release/rollback scripts và Playwright production-topology harness đã được thêm. `pnpm check` xanh với 6 proxy tests, 9 API integration tests, 5 contract tests và 1 web component test; Playwright discover đúng 1 topology test; bốn Linux scripts qua `bash -n`, LF check và Git mode `100755`. Health outage test chứng minh liveness vẫn 200 và readiness trả safe 503 khi database mất kết nối.
- Production topology chưa được chạy. Gate chính xác: `DEFERRED_EXTERNAL_CREDENTIALS`. Còn thiếu `LOP_SACH_TOPOLOGY_WEB_ORIGIN`, `LOP_SACH_TOPOLOGY_API_ORIGIN`, `LOP_SACH_SMOKE_USERNAME`, `LOP_SACH_SMOKE_PASSWORD`, cùng Vercel/VPS/DNS/Atlas access. Không có production URL nào đã được xác minh.
- Milestone 3: classroom/groups, students và task-template APIs dùng owner/classroom scoping, stable group IDs, optimistic entity versions và transactionally incremented classroom/student/task revision counters. Classroom mới có bốn tổ và ba task mặc định. Student persistence/API chỉ chấp nhận `NO_HEAVY_TASKS`, `TASK_EXCLUSION`, `EXEMPT_DATE_RANGE`; request `UNAVAILABLE_DATE` bị 422 và không ghi database. Group có active-student guard; deactivate/move giữ document thay vì xóa. Task reorder yêu cầu đúng toàn bộ set và tasks revision. Full gate xanh: 6 proxy tests, 5 contract tests, 13 API integration tests và 1 web test.
- Milestone 4: web có auth/onboarding route guards, wizard sáu bước resumable, responsive desktop sidebar/mobile bottom navigation, classroom/group/student/task CRUD UI, password-change flow và Vietnamese loading/empty/error states. Student form chỉ có no-heavy, task-exclusion và exempt-date-range; test xác nhận không có control absence theo ngày. Bốn component tests, production build và full gate xanh. Runtime smoke trong lúc chuẩn bị Browser QA phát hiện compiled Node 24 không tương thích named runtime imports từ Mongoose; mọi model/service đã đổi sang default runtime import và `pnpm check` nay có `test:api-runtime` để chặn regression.
- In-app Browser không có instance khả dụng trong phiên nên không có tuyên bố visual Browser smoke. Responsive layout được kiểm tra bằng component/build gates và CSS breakpoint 760/480 px; interactive Browser verification vẫn phải chạy khi surface khả dụng hoặc trong E2E milestone.

## Remaining work

Thực hiện tuần tự toàn bộ milestones, cập nhật phần này sau mỗi gate.

## Known issues

- Chưa có Vercel, VPS, DNS, Atlas và GitHub deployment credentials; production topology giữ trạng thái `DEFERRED_EXTERNAL_CREDENTIALS`, chỉ ảnh hưởng smoke/deployment thật.
