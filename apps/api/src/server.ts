import { createServer } from 'node:http';
import { createApp } from './app/create-app.js';
import { loadConfig } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './database/connect.js';

const config = loadConfig();
await connectDatabase(config.mongoUri);
const server = createServer(createApp(config));
server.listen(config.port, '127.0.0.1');

function shutdown(): void {
  server.close(() => { void disconnectDatabase().then(() => process.exit(0)); });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
