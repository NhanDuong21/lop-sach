# Product specification

Lớp Sạch là trợ lý phân công trực nhật cho một lớp học và một người vận hành. Người vận hành tự chọn tổ trực; hệ thống tự phân công học sinh trong tổ bằng thuật toán deterministic, công bằng, có giải thích và cho phép chỉnh sửa/khóa thủ công.

V1 bao gồm onboarding, lớp/tổ/học sinh/task, absence theo ngày, tuần DRAFT/PUBLISHED/COMPLETED, replacement, history, text/PNG export, JSON backup/restore và PWA offline read-only. V1 không gồm auto group selection, tài khoản giáo viên/học sinh, public links, notification, offline writes, AI hoặc school-management scope.

UI dùng tiếng Việt, light mode và không emoji. Product name và classroom name là hai khái niệm riêng; lớp mặc định là 10C8.

Availability model gồm duty-week absence cho một ngày và ba student restrictions: `NO_HEAVY_TASKS`, `TASK_EXCLUSION`, `EXEMPT_DATE_RANGE`.

Tuần trực là date-only. Nhiều công việc cùng ngày là một soft constraint có thể nới với cảnh báo rõ ràng; V1 không có thời gian bắt đầu, kết thúc hoặc time bucket. Published week không regenerate; publish luôn kiểm tra lại context revisions/hash và toàn bộ hard constraints hiện tại.
