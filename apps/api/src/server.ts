import { createServer } from 'node:http';
import { createApp } from './app/create-app.js';
import { loadConfig } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './database/connect.js';

const config = loadConfig();
const server = createServer(createApp(config));
let shuttingDown = false;
let retryTimer: NodeJS.Timeout | undefined;

async function connectWithRetry(): Promise<void> {
  try {
    await connectDatabase(config.mongoUri);
    process.stdout.write('Database connection ready.\n');
  } catch {
    process.stderr.write(
      'Database unavailable; readiness remains unavailable and connection will retry.\n',
    );
    if (!shuttingDown) retryTimer = setTimeout(() => void connectWithRetry(), 10_000);
  }
}

server.listen(config.port, '127.0.0.1', () => void connectWithRetry());

function shutdown(): void {
  shuttingDown = true;
  if (retryTimer) clearTimeout(retryTimer);
  server.close(() => {
    void disconnectDatabase().then(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
