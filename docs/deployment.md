# Deployment

Production topology là Browser → Vercel → HTTPS Nginx/VPS → Express loopback → MongoDB Atlas.

## Production đã xác minh

Mốc triển khai ngày 28/08/2026 dùng các tài nguyên sau:

- Web canonical: `https://lopsach.site`; `https://www.lopsach.site` chuyển hướng về apex; Vercel project `lop-sach` lấy cấu hình từ repository root.
- API public: `https://api.lopsach.site`; chỉ `/api/v1` và hai health endpoint được Nginx public. Kết nối thẳng cổng `3000` từ Internet bị chặn.
- VPS: IPv4 `180.93.32.127`, hostname `linux8532`, Ubuntu 22.04 x86_64, 1 vCPU, 969 MiB RAM, 2 GiB swap. UFW chỉ mở 22/80/443.
- Runtime: Node.js 24, một process `lop-sach-api.service` chạy bằng system user không đăng nhập, bind `127.0.0.1:3000`. Liveness/readiness nội bộ và HTTPS đều trả trạng thái xanh.
- Atlas: project `Lớp Sạch` (`6a915b20ac97d40d2fc369a2`), cluster Free `lop-sach-prod`, MongoDB 8.0 tại AWS `ap-east-1`, database `lop_sach`. Network allowlist chỉ có VPS `/32`; database user chỉ có custom role read/write trên database ứng dụng.
- Migration production: `0001-initial-indexes`, checksum `sha256:8ae95e4c987ea7afec13e8afda997cca05159224d90a25fe4bad9dbd834f2446`.
- GitHub Environment `Production` có đúng năm secret theo tên `VPS_HOST`, `VPS_PORT`, `VPS_USER`, `VPS_DEPLOY_KEY`, `VPS_KNOWN_HOSTS`. Dedicated deploy user/key đã được chứng minh bằng các workflow `Deploy API` xanh.
- Rollback drill thật đã chuyển release đang chạy sang release tương thích trước đó rồi tiến lại release mới; cả hai lần đều qua liveness/readiness và không chạy down migration.
- Bootstrap key tạm của root đã bị gỡ đúng một entry khỏi `authorized_keys`; hai file key tạm cục bộ đã được xóa an toàn. Dedicated deploy key được giữ lại; emergency root access không bị tắt.

Topology Playwright đã đi qua đúng production chain và xác minh HTTPS, login, session sau refresh, cookie host-only với các cờ bảo mật, Origin sai bị từ chối, logout revoke phiên và mọi auth response có `no-store`. Product smoke xác minh luồng lớp/tuần/lịch sử, việc phát sinh, lịch không thể xếp, chỉnh tay, thay người, khóa/tạo lại, text/PNG, backup validation, responsive và PWA offline read-only. Không ghi username, password, cookie, token hoặc URI có secret vào tài liệu này.

## Vercel từ repository root

Import Git repository với Root Directory để trống, nghĩa là repository root. Không chọn `apps/web` và không bật setting dashboard-only để cho phép import file bên ngoài app.

- Build command: `pnpm --filter @lop-sach/web build`
- Output directory: `apps/web/dist`
- Install command: để Vercel nhận `pnpm-lock.yaml` và `packageManager` ở root.
- Framework preset: Vite hoặc Other; `vercel.json` ở root là nguồn cấu hình checked-in.
- Production server variables: `LOP_SACH_API_ORIGIN` và `LOP_SACH_PROXY_SECRET`.
- Xác nhận Vercel function runtime dùng `NODE_ENV=production`; proxy dùng giá trị này để bắt buộc HTTPS upstream. Đây là platform runtime value, không phải secret.
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

Các path và service name đã implement:

- Release root: `/opt/lop-sach/releases/<release-id>`.
- Active symlink: `/opt/lop-sach/current`.
- API environment: `/etc/lop-sach/api.env`.
- systemd source template: `ops/systemd/lop-sach-api.service`.
- systemd installed unit: `/etc/systemd/system/lop-sach-api.service`.
- Nginx source template: `ops/nginx/lop-sach-api.conf`.
- Nginx installed candidate: `/etc/nginx/sites-available/lop-sach-api.conf`.
- Nginx enabled symlink: `/etc/nginx/sites-enabled/lop-sach-api.conf`.
- Rollback helper sau khi admin review/install: `/usr/local/sbin/lop-sach-rollback-api`.

Trong lần bootstrap VPS, copy đúng hai template trên tới installed paths, tạo enabled symlink, rồi chạy `systemctl daemon-reload`, `systemctl enable lop-sach-api.service` và `nginx -t` trước khi start/reload. Thay toàn bộ `api.example.invalid` trong Nginx candidate bằng API hostname thật, bao gồm `server_name` và hai certificate paths. Xem diff candidate trước khi cài; không ghi secret trong Nginx config hoặc repository.

## Environment file trên VPS

`/etc/lop-sach/api.env` thuộc root, quyền tối đa `0640`, không được log hoặc copy vào release:

```text
PORT=3000
MONGODB_URI=<Atlas URI>
APP_ORIGIN=https://<frontend-host>
LOG_LEVEL=info
LOP_SACH_PROXY_SECRET=<random secret at least 32 characters>
```

`NODE_ENV=production` không nằm trong file này vì unit `lop-sach-api.service` đặt trực tiếp và deploy script cũng export trước khi chạy migration. Giữ `PORT=3000`: Nginx upstream, systemd readiness và deploy/rollback scripts hiện cùng dùng cổng này. Thay đổi port cần sửa đồng bộ các file vận hành rồi redeploy, không chỉ sửa environment file.

## Migration và owner bootstrap

Trong source checkout dành cho development, lệnh migration là:

```bash
pnpm --filter @lop-sach/api db:migrate
```

Production không có `tsx` dev dependency. `deploy-api.sh` source `/etc/lop-sach/api.env`, export `NODE_ENV=production` và chạy migration đã compile trên inactive release bằng:

```bash
/usr/bin/node /opt/lop-sach/releases/<release-id>/apps/api/dist/cli/migrate.js
```

Script chỉ đổi `/opt/lop-sach/current` sau khi lệnh này thành công. Không chạy migration thủ công trên active release như một cách bỏ qua deploy gate.

Sau deployment đầu tiên, tạo owner đúng một lần từ terminal quản trị bảo mật. Không truyền password qua CLI argument và không ghi password vào shell history:

```bash
sudo -i
set -a
source /etc/lop-sach/api.env
set +a
export NODE_ENV=production
read -r -p "Owner username: " OWNER_USERNAME
read -r -p "Owner display name: " OWNER_DISPLAY_NAME
read -r -s -p "Owner password: " OWNER_PASSWORD
printf '\n'
export OWNER_USERNAME OWNER_DISPLAY_NAME OWNER_PASSWORD
sudo -u lop-sach --preserve-env=NODE_ENV,PORT,MONGODB_URI,APP_ORIGIN,LOG_LEVEL,LOP_SACH_PROXY_SECRET,OWNER_USERNAME,OWNER_DISPLAY_NAME,OWNER_PASSWORD \
  /usr/bin/node /opt/lop-sach/current/apps/api/dist/cli/owner.js
unset OWNER_PASSWORD OWNER_USERNAME OWNER_DISPLAY_NAME
exit
```

`OWNER_PASSWORD` phải có ít nhất 12 ký tự; nên tạo bằng password manager. Chạy lại CLI với cùng normalized username sẽ đổi password/display name và revoke toàn bộ session. V1 không cho tạo owner thứ hai.

## Topology smoke gate

Smoke cơ bản không cần credential. Đặt đúng hai biến mà `smoke-test.sh` đọc:

```bash
export LOP_SACH_WEB_ORIGIN=https://<frontend-host>
export LOP_SACH_API_ORIGIN=https://<api-host>
ops/scripts/smoke-test.sh
```

Topology smoke có login cần bốn biến riêng sau trong terminal/secret store; không ghi username/password vào shell history hoặc Git:

```bash
export LOP_SACH_TOPOLOGY_WEB_ORIGIN=https://<frontend-host>
export LOP_SACH_TOPOLOGY_API_ORIGIN=https://<api-host>
read -r -p "Smoke owner username: " LOP_SACH_SMOKE_USERNAME
read -r -s -p "Smoke owner password: " LOP_SACH_SMOKE_PASSWORD
printf '\n'
export LOP_SACH_SMOKE_USERNAME LOP_SACH_SMOKE_PASSWORD
ops/scripts/topology-smoke-test.sh
unset LOP_SACH_SMOKE_PASSWORD LOP_SACH_SMOKE_USERNAME
```

Playwright kiểm tra HTTPS, login qua frontend origin, cookie host/flags, `auth/me` sau refresh, Origin sai bị 403, logout xóa/revoke session, liveness/readiness và `no-store`.

Không chuyển gate thành `VERIFIED` nếu test bị skip, thiếu biến, chỉ chạy local hoặc chưa đi qua đúng Vercel/Nginx production chain.

## CI/CD thủ công

CI từ repository root chạy frozen install, repository text/executable-mode policy, format, lint, typecheck, unit/integration tests, production build, API runtime import, cài Chromium và ba local E2E. Playwright report được lưu bảy ngày khi E2E thất bại. Production dependency audit không được còn advisory mức high.

Workflow `Deploy API` chỉ có `workflow_dispatch`, không tự deploy khi push. Tạo GitHub environment `Production`, bật required reviewers khi quy trình phê duyệt yêu cầu và đặt các environment secrets:

- `VPS_HOST`: hostname/IP của VPS.
- `VPS_PORT`: cổng SSH, thường là `22`.
- `VPS_USER`: deploy user có quyền sudo giới hạn cho quy trình cài release và systemd service này.
- `VPS_DEPLOY_KEY`: private key chỉ dành cho deploy user.
- `VPS_KNOWN_HOSTS`: host-key line đã xác minh ngoài band; không dùng `StrictHostKeyChecking=no` hoặc `ssh-keyscan` mù trong workflow.

Job validate phải xanh trước job deploy. Job deploy build lại artifact từ đúng commit, chỉ đóng gói root workspace metadata, API dist và dist của hai shared packages, rồi upload duy nhất archive vào `/tmp`. Deploy user không được chạy script do workflow upload; SSH chỉ được `sudo` helper root-owned đã cài tại `/usr/local/sbin/lop-sach-deploy-api`, với release ID là full commit SHA. GitHub environment approval là điểm phê duyệt thao tác production không thể coi là repository-side validation.

Trước lần chạy đầu, admin phải tạo user/group `lop-sach`, các thư mục `/opt/lop-sach/releases`, `/etc/lop-sach/api.env`, cài systemd/Nginx candidate sau khi review, và xác minh quyền sudo tối thiểu. Không lưu deploy key, known-hosts, env file hoặc smoke password trong repository/artifact.

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

Giữ ít nhất ba release. Sau khi admin đã review và cài `ops/scripts/rollback-api.sh` thành `/usr/local/sbin/lop-sach-rollback-api` với owner root và mode `0750`, lệnh rollback chính xác là:

```bash
sudo /usr/local/sbin/lop-sach-rollback-api <existing-release-id>
```

Script chỉ nhận release ID đã tồn tại dưới `/opt/lop-sach/releases`, đổi symlink atomically, restart `lop-sach-api.service` và kiểm tra `http://127.0.0.1:3000/health/ready`; script không down-migrate database. Backup ứng dụng là bắt buộc trước release ảnh hưởng schema, restore hoặc kỳ nghỉ dài.
