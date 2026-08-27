# ExecPlan: Lớp Sạch initial delivery

## Trạng thái

- Bắt đầu: 2026-08-27
- Nhánh: `main`
- Milestone hiện tại: 10 — PWA/offline
- Production topology: `DEFERRED_EXTERNAL_CREDENTIALS`

## Milestones

| Milestone                      | Trạng thái               | Commit                                                          | Validation                                                  |
| ------------------------------ | ------------------------ | --------------------------------------------------------------- | ----------------------------------------------------------- |
| 0. Repository foundation       | Hoàn tất                 | `chore(repo): establish repository foundation`                  | `pnpm check` xanh                                           |
| 1. Contracts/date-only         | Hoàn tất                 | `feat(contracts): define shared duty scheduling contracts`      | 5 tests xanh; typecheck/lint xanh                           |
| 2. Auth/migrations/login shell | Hoàn tất                 | `feat(auth): add secure sessions and deployment-ready login`    | 20 tests xanh; full `pnpm check` xanh                       |
| 2.5. Deployment topology spike | Hoàn tất phần repository | `chore(deploy): add verifiable production topology`             | Repo gates xanh; production `DEFERRED_EXTERNAL_CREDENTIALS` |
| 3. Master-data API             | Hoàn tất                 | `feat(classroom): add revisioned classroom master data`         | 25 tests xanh; full `pnpm check` xanh                       |
| 4. Master-data UI              | Hoàn tất                 | `feat(web): complete onboarding and classroom management`       | 28 tests + API runtime import; full `pnpm check` xanh       |
| 5. Scheduler core/hash         | Hoàn tất                 | `feat(scheduler): add canonical deterministic generation`       | 17 scheduler tests; full `pnpm check` xanh                  |
| 6. Fairness/replacements       | Hoàn tất                 | `feat(scheduler): add bounded fairness and explainable ranking` | 25 scheduler tests; full `pnpm check` xanh                  |
| 7. Duty-week lifecycle         | Hoàn tất                 | `feat(duty-weeks): add stale-safe weekly lifecycle`             | 11 duty-week API/size tests; full `pnpm check` xanh         |
| 8. Weekly UI                   | Hoàn tất                 | `feat(web): add canonical duty-week workflow`                   | 5 web tests + local real-API E2E; full `pnpm check` xanh    |
| 9. History/export/backup       | Hoàn tất                 | `feat(history): add stable history exports and backup`          | 74 tests + export/history E2E; full `pnpm check` xanh       |
| 10. PWA/offline                | Chưa bắt đầu             | Chưa có                                                         | Chưa chạy                                                   |
| 11. Quality/docs               | Chưa bắt đầu             | Chưa có                                                         | Chưa chạy                                                   |
| 12. Production deployment      | Bị chặn ngoài repo       | Chưa có                                                         | Chưa chạy                                                   |

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
- Milestone 5: scheduler framework-independent đã có canonical JSON với object-key sorting, semantic-set normalization và SHA-256 đa runtime từ `@noble/hashes`; FNV-1a chỉ dùng cho deterministic candidate tie-breaking. Context hash bao gồm engine version, generation revision và classroom/student/task/week revisions. Hard eligibility chỉ dùng group/active/participation, duty-week absence, ba persistent restriction types và hard gender rule; không có start time, end time, time bucket hay same-day hard constraint. Manual/locked assignment hợp lệ được giữ; fixed assignment không hợp lệ làm generation fail rõ ràng. 17 scheduler tests xanh, gồm SHA-256 known vector, permutation-invariant hash/output, version/revision mutation, outdated-client reload response, lock preservation, impossible schedule và repeated invariant permutations. Full `pnpm check` xanh với 45 tests toàn repository và API compiled runtime import.
- Milestone 6: fairness dùng aggregate actual/opportunity với prior `P=4`; baseline chỉ giữ tám eligible completed-week summaries gần nhất và deterministic loại tuần thứ chín. Candidate scoring áp dụng đúng trọng số đã duyệt, controlled relaxation theo bốn cấp và warning có cấu trúc; nhiều assignment cùng ngày vẫn là soft constraint. Local improvement chỉ swap assignment `AUTO` chưa lock, có giới hạn `min(500, 4 × slotCount²)`, chỉ nhận strict improvement và validate hard constraints sau mỗi accepted swap/lần cuối. Replacement dùng cùng hard filters, xếp hạng deterministic, sinh giải thích tiếng Việt từ fact thật và chỉ đổi slot đích. Fairness score/label/cap khi unassigned đã được triển khai. 25 scheduler tests xanh, gồm new-student shrinkage, eight-week truncation, same-day relaxation, local improvement và replacement isolation; full `pnpm check` xanh với 53 tests toàn repository.
- Milestone 7: API đã có đầy đủ duty-week aggregate/lifecycle, recurring và one-off occurrences, weekly absences, manual/lock/swap/replacement, backend canonical generation, explicit manual preflight, publish/complete transitions và actual-performer ledger. Publish dựng lại SHA-256 context, phát hiện master-data staleness và chạy lại toàn bộ hard validator; client version cũ nhận `SCHEDULER_VERSION_OUTDATED` cùng `RELOAD_REQUIRED`. Đổi tổ bị chặn khi còn lock; nếu không thì xóa toàn assignments, loại absences tổ cũ và đặt `requiresGeneration`. Baseline aggregate toàn lịch sử nhưng chỉ embed tám recent summaries; không embed duty-week cũ. Change log compact 50 entry theo chained SHA-256 khi chạm 200; document guard là 8 MiB cùng giới hạn 64 occurrences/128 slots/32 fingerprints. Integration tests bao phủ unique/race version, stale publish, hard-constraint publish preflight, immutable completion, group clearing, manual preflight, one-off/replacement/swap; size tests bao phủ BSON guard, history compaction và eight-week baseline. Full repository gate xanh.
- Milestone 8: web đã có luồng tuần đầy đủ trên mobile/desktop: tạo tuần và chọn tổ, cập nhật vắng mặt theo ngày, one-off occurrence, preview bằng shared scheduler, backend canonical generation, manual assignment/lock/swap/replacement, stale-context preflight, publish revision và completion với actual performer. Đổi tổ hiển thị xác nhận xóa dữ liệu cũ hoặc bị chặn khi có lock; scheduler-version mismatch yêu cầu reload và không retry proposal cũ; same-day relaxation hiển thị warning tiếng Việt. Current-week route đọc DTO thật thay cho placeholder. Component test bao phủ stale banner, same-day warning, locked-group safeguard và disabled publish. Playwright E2E dùng API thật cùng MongoDB replica set, chạy toàn bộ login → master-data setup → create → generate → publish tại viewport 360 px và xác nhận không tràn ngang. Playwright được pin `1.58.0` để khớp browser runtime đã cài. Full `pnpm check` xanh với 70 unit/integration tests; local E2E 1/1 xanh.
- Milestone 9: history summary/metrics đọc duy nhất completed ledger và display snapshots, nên đổi tên tổ trong master data không làm đổi màn hình lịch sử; fallback từ assigned performer được đánh dấu đúng trong ledger. Detail screen hiển thị publication revision, warning, bounded change summary và actual performer. Text export, PNG canvas rộng cố định 1080 px, filename được sanitize và Web Share có download fallback; E2E kiểm tra nội dung text không lộ generation hash. Backup envelope schema v1 có product version và strict nested contracts; export loại users, password/session token, schema migrations, secrets và raw owner ID. Validate dựng SHA-256 digest từ canonical JSON và kiểm tra toàn bộ reference; restore yêu cầu đúng digest, chạy thay thế domain data trong một MongoDB transaction, giữ nguyên users/sessions và không ghi `schemaMigrations`. UI bắt buộc xuất pre-restore backup, server validation và cụm xác nhận rõ ràng. API dùng body limit riêng 2 MiB cho backup, còn route thường giữ 256 KiB. Full `pnpm check` xanh với 74 unit/integration tests; Playwright real-API E2E 1/1 xanh qua login → publish → complete → history → text/PNG export tại 360 px.

## Remaining work

Thực hiện tuần tự toàn bộ milestones, cập nhật phần này sau mỗi gate.

## Known issues

- Chưa có Vercel, VPS, DNS, Atlas và GitHub deployment credentials; production topology giữ trạng thái `DEFERRED_EXTERNAL_CREDENTIALS`, chỉ ảnh hưởng smoke/deployment thật.
