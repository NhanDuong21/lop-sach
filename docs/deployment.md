# Deployment

Production topology là Browser → Vercel → HTTPS Nginx/VPS → Express loopback → MongoDB Atlas. Tại thời điểm Milestone 2.5, cấu hình và smoke harness trong repository đã có nhưng chưa có credentials hoặc host để chạy thật; gate production là `DEFERRED_EXTERNAL_CREDENTIALS`, không phải `VERIFIED`.

## Vercel từ repository root

Import Git repository với Root Directory để trống, nghĩa là repository root. Không chọn `apps/web` và không bật setting dashboard-only để cho phép import file bên ngoài app.

- Build command: `pnpm --filter @lop-sach/web build`
- Output directory: `apps/web/dist`
- Install command: để Vercel nhận `pnpm-lock.yaml` và `packageManager` ở root.
- Framework preset: Vite hoặc Other; `vercel.json` ở root là nguồn cấu hình checked-in.
- Production server variables: `LOP_SACH_API_ORIGIN` và `LOP_SACH_PROXY_SECRET`.
- Không tạo biến `VITE_*` cho upstream hoặc proxy secret.
- Preview không được trỏ production API mặc định.

`LOP_SACH_API_ORIGIN` production phải là một HTTPS origin không có path, query, credential hoặc fragment. Root function chỉ forward `/api/v1`, không nhận target URL từ request, giữ cookie/query/method/request ID, bỏ hop-by-hop headers và ép `Cache-Control: no-store`.

## Atlas và forward-only migrations

- Tạo database user có `readWrite` chỉ trên database ứng dụng; network allowlist chỉ chứa VPS IP cần thiết.
- Đặt `MONGODB_URI` ngoài Git trong `/etc/lop-sach/api.env`; Mongoose pool tối đa 5.
- Production không gọi `syncIndexes()` và không tự drop index.
- Mỗi migration có stable ID/checksum và ghi vào `schemaMigrations`.

`ops/scripts/deploy-api.sh` thực hiện theo thứ tự:

1. Xác minh archive, release ID và environment file.
2. Giải nén artifact đã build/test trong CI vào release chưa active, xác nhận compiled server/migration CLI và frozen-install production dependencies.
3. Chạy migration trên release mới.
4. Nếu migration lỗi, dừng trước khi thay symlink `current`.
5. Nếu migration thành công, đổi symlink atomically, restart một systemd process và kiểm tra readiness.
6. Nếu readiness lỗi, phục hồi code release trước; không chạy down migration.

Migration phải backward-compatible với release trước trong ít nhất một rollback window. Xóa index cần một kế hoạch riêng, backup và phê duyệt vận hành.

## VPS, Nginx và systemd

Trước lần cài đầu tiên, ghi lại hostname, CPU architecture, RAM, disk, swap, ports/firewall và các service đang có. Target dùng Node 24, Nginx, Certbot; không cài Docker, Redis, local MongoDB hoặc PM2 cho ứng dụng này.

- API bind `127.0.0.1:3000`; firewall chỉ mở SSH/HTTP/HTTPS.
- systemd chạy một process, heap 384 MiB, `MemoryMax=512M`, graceful SIGTERM và env ngoài Git.
- Nginx TLS chỉ public `/api/v1` cùng hai health endpoints.
- Nginx giới hạn 256 KiB mặc định và 2 MiB cho backup validate/restore, với timeout 15/30 giây.
- Access log chuẩn không chứa cookie hoặc body; không thêm `$http_cookie`, proxy secret hay request body vào log format.
- Vercel tạo `X-Forwarded-For` đã sanitize. Nginx ghi đè header chuyển tới Express từ giá trị đó; Express production tin đúng một hop Nginx và kiểm tra proxy secret trước rate limiting. Request direct không có secret bị từ chối.
- Nếu host 1 GiB chưa có swap, tạo 1 GiB swap chỉ sau khi xác minh đúng disk/mount và free space.

Thay `api.example.invalid` trong Nginx template bằng DNS thật, chạy `nginx -t`, xem diff candidate config rồi mới reload. Không ghi secret trong Nginx config hoặc repository.

## Environment file trên VPS

`/etc/lop-sach/api.env` thuộc root, quyền tối đa `0640`, không được log hoặc copy vào release:

```text
PORT=3000
MONGODB_URI=<Atlas URI>
APP_ORIGIN=https://<frontend-host>
LOG_LEVEL=info
LOP_SACH_PROXY_SECRET=<random secret at least 32 characters>
```

## Topology smoke gate

Đặt các biến sau trong terminal/secret store, không ghi vào shell history hoặc Git:

```text
LOP_SACH_TOPOLOGY_WEB_ORIGIN
LOP_SACH_TOPOLOGY_API_ORIGIN
LOP_SACH_SMOKE_USERNAME
LOP_SACH_SMOKE_PASSWORD
```

Sau đó chạy `ops/scripts/smoke-test.sh` và `ops/scripts/topology-smoke-test.sh`. Playwright kiểm tra HTTPS, login qua frontend origin, cookie host/flags, `auth/me` sau refresh, Origin sai bị 403, logout xóa/revoke session, liveness/readiness và `no-store`.

Không chuyển gate thành `VERIFIED` nếu test bị skip, thiếu biến, chỉ chạy local hoặc chưa đi qua đúng Vercel/Nginx production chain.

## Atlas Free bị pause

Dấu hiệu an toàn là `/health/live` vẫn trả 200 nhưng `/health/ready` trả `503` với code `DEPENDENCY_UNAVAILABLE`. Log chỉ được nói dependency timeout/unavailable sau redaction, không lộ Mongo URI.

Quy trình resume:

1. Mở Atlas console và xác nhận Free cluster đang paused/unavailable, thay vì restart-loop API.
2. Chọn Resume trong Atlas UI và chờ Atlas báo Available.
3. Poll `/health/ready` với timeout hợp lý cho tới 200.
4. Xác nhận login qua frontend và tải current-week thành công.
5. Nếu readiness vẫn 503, kiểm tra network allowlist, database user và DNS mà không in URI ra log.

Trước kỳ nghỉ dài hoặc tắt VPS:

1. Export versioned JSON backup từ ứng dụng.
2. Parse file và chạy backup validation, xác nhận `schemaVersion` cùng revision/thời điểm export.
3. Lưu bản sao mã hóa ở nơi an toàn ngoài VPS.
4. Nếu Atlas tier hiện tại hỗ trợ snapshot, tạo thêm snapshot và ghi thời điểm.
5. Không coi shutdown VPS là backup vì database nằm trên Atlas.

## Rollback và retention

Giữ ít nhất ba release. `rollback-api.sh` chỉ nhận một release ID đã tồn tại dưới `/opt/lop-sach/releases`, đổi symlink atomically và kiểm tra readiness; script không down-migrate database. Backup ứng dụng là bắt buộc trước release ảnh hưởng schema, restore hoặc kỳ nghỉ dài.
