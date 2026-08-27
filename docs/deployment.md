# Deployment

Deployment production dùng Vercel từ repository root, một Express process dưới systemd/Nginx trên Ubuntu 22.04 và MongoDB Atlas. Hướng dẫn lệnh, topology verification, migration, rollback và Atlas Free operations sẽ được hoàn thiện ở Milestone 2.5 và 11 trước khi deploy thật.

Không dùng `syncIndexes()`; release mới phải chạy forward-only migrations thành công trước khi đổi active symlink.
