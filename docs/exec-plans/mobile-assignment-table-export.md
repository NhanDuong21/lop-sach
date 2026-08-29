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
- [x] Chạy full local gates và E2E mobile; Browser production chờ deploy.
- [ ] Commit, push, deploy và xác minh production.

## Kết quả

Local validation đã xanh với 108 tests trong `pnpm check`, Playwright E2E 3/3 và `pnpm audit:prod` không có vulnerability đã biết. Weekly E2E tại 360 px tải được `lop-sach-10c8-2026-08-24-ban-nhap.png`, sau đó tiếp tục công bố, hoàn thành và tải export chính thức như trước. Còn deploy và Browser smoke production.
