# ADR 0006: Forward-only database migrations

Indexes và database changes dùng stable forward-only migration IDs lưu trong `schemaMigrations`. Không chạy `syncIndexes()` hoặc tự drop production index.
