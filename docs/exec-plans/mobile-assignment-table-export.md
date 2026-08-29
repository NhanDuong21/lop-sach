# ExecPlan: Mobile assignment table export

## Mục tiêu

Tại bước `Kiểm tra phân công`, cho phép tải ngay ảnh PNG dạng bảng từ dữ liệu bản nháp hiện tại để đối chiếu toàn tuần trên điện thoại mà không phải cuộn qua từng thẻ công việc.

## Bất biến

- Ảnh bản nháp phải được ghi rõ là bản kiểm tra, không thể bị hiểu là lịch đã công bố.
- Export chỉ đọc DTO đang hiển thị, không tạo mutation, không thay đổi scheduler hoặc lifecycle tuần.
- Export sau công bố/hoàn thành và filename hiện tại phải giữ tương thích.
- UI tiếp tục tiếng Việt, light mode và không tràn ngang ở mobile.

## Kế hoạch

- [x] Thêm action tải bảng PNG ngay phía trên danh sách phân công ở bước 2.
- [x] Đặt nhãn `BẢNG KIỂM TRA PHÂN CÔNG` và `BẢN NHÁP` trong PNG draft.
- [x] Thêm component/E2E regression cho button, filename và file download thật.
- [x] Chạy full local gates và E2E mobile; kiểm tra Browser production mà không tạo dữ liệu thật.
- [x] Commit, push, deploy và xác minh production.

## Kết quả

Local validation đã xanh với 108 tests trong `pnpm check`, Playwright E2E 3/3 và `pnpm audit:prod` không có vulnerability đã biết. Weekly E2E tại 360 px tải được `lop-sach-10c8-2026-08-24-ban-nhap.png`, sau đó tiếp tục công bố, hoàn thành và tải export chính thức như trước.

Implementation commit `054dcae` đã lên `origin/main`; CI run `33239565970` xanh với E2E 3/3. Production HTML/PWA đã chuyển sang `index-FC-rJXnE.js`; chunk `WeekEditorPage-Bc5zNthE.js` chứa card/button/filename draft và chunk `WeekExportActions-BhHBCx_U.js` chứa cả hai nhãn PNG draft. Browser production đã nhận service-worker update trong phiên thật và API readiness vẫn `ready`.

Production không còn draft tại thời điểm smoke. Không tạo/xóa dữ liệu thật chỉ để chụp màn hình; responsive rendering và download được xác minh bằng real-backend E2E cô lập ở 360 px, còn Browser production xác minh đúng bundle/PWA đã phát hành.
