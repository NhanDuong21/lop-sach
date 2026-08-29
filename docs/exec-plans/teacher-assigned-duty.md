# ExecPlan: Teacher-assigned duty outside the selected group

## Mục tiêu

Cho phép giáo viên chỉ định một học sinh ngoài tổ trực vào đúng một vị trí công việc có sẵn, không tự tăng số người của công việc và không biến lượt chỉ định thành lợi thế fairness cho tuần trực bình thường của học sinh đó.

## Bất biến

- Tổ trực chính và số vị trí của từng công việc không thay đổi khi chỉ định học sinh ngoài tổ.
- Chỉ nguồn `TEACHER_ASSIGNED` mới được vượt qua điều kiện cùng tổ; vắng mặt, thời gian tham gia, giới tính bắt buộc và restrictions vẫn là hard constraints.
- Bộ xếp lịch tự động chỉ chọn học sinh thuộc tổ trực; phân công giáo viên chỉ định là fixed assignment và phải sống qua regenerate/preflight.
- Lượt giáo viên chỉ định vẫn nằm trong assignment/actual-performer history nhưng không có actual points, opportunity points hoặc recent-task credit trong fairness baseline.
- Nếu người thuộc tổ trực thực tế làm thay vị trí giáo viên chỉ định, người thực tế vẫn nhận fairness credit bình thường.
- Lịch công bố chỉ hiển thị người làm; lý do kỷ luật không được đưa vào nội dung chia sẻ hoặc export.

## Kế hoạch

- [x] Mở rộng contract và tăng scheduler engine version cho nguồn `TEACHER_ASSIGNED`.
- [x] Cho scheduler giữ fixed assignment ngoài tổ nhưng không mở rộng candidate pool tự động.
- [x] Làm mới snapshot của học sinh được chỉ định và xác nhận lại hard constraints ở backend.
- [x] Loại lượt chỉ định khỏi fairness hiện tại và completion ledger dùng cho các tuần sau.
- [x] Cho UI bước Kiểm tra phân công chọn học sinh ngoài tổ vào vị trí hiện có, có nhãn rõ `Không tính điểm cân bằng`.
- [x] Hướng dẫn trường hợp muốn giữ nguyên phần việc của tổ trực phải tạo công việc phát sinh thật trước.
- [x] Thêm scheduler, API integration, component và real-backend mobile E2E regression.
- [x] Chạy full repository gates, toàn bộ Playwright và production dependency audit.
- [x] Commit/push `7545b84`, chờ CI và Vercel production xanh, rồi deploy đúng full SHA qua workflow API production.
- [x] Smoke HTTPS frontend, API live/ready, frontend proxy `401 + no-store`, redirect `www` và production bundle mà không sửa dữ liệu UAT.

## Tiến độ xác minh

- Scheduler regression: học sinh ngoài tổ được ghim đúng một slot; ordinary manual assignment không thể giả nguồn để vượt tổ; eligibility giới tính vẫn là hard constraint.
- API integration: regenerate giữ nguyên chỉ định, tổng assignment không tăng, completion lưu actual performer nhưng không tạo completion-ledger entry cho học sinh ngoài tổ.
- Component regression: dropdown tách tổ trực và nhóm giáo viên chỉ định; nguồn được hiển thị rõ không tính điểm cân bằng.
- Weekly real-backend E2E tại 360 px: chọn học sinh Tổ 2 vào slot Tổ 1, regenerate, publish, complete và xác nhận ledger không cấp fairness credit.

Full `pnpm check` xanh với 113 tests, production builds và API runtime import. Playwright real-backend 3/3 xanh, trong đó weekly workflow xác minh toàn bộ chỉ định ngoài tổ tại 360 px. `pnpm audit:prod` không có vulnerability đã biết và `git diff --check` sạch.

Commit tính năng `7545b8424592ca001c09681309430fd6a0c84a4b` đã lên `main`. CI `33242401490`, Vercel production và workflow API `33242404967` đều xanh; helper trên VPS xác nhận kích hoạt đúng release full SHA. Smoke sau deploy trả frontend `200`, `/health/live` là `ok`, `/health/ready` là `ready`, `/api/v1/auth/me` qua frontend là `401` với `Cache-Control: no-store`, `www` chuyển về apex và asset production `index-CeRa0lu3.js` chứa nguồn `TEACHER_ASSIGNED`. Smoke không tạo, sửa hoặc xóa dữ liệu production.

## Quyết định

Không thêm resource/time bucket vào domain. `requiredStudents` tiếp tục là sức chứa thực tế của công việc; học sinh ngoài tổ chiếm một slot hiện có. Khi cần thêm khối lượng thật, giáo viên dùng công việc phát sinh đã có rồi chỉ định học sinh vào slot của công việc đó.
