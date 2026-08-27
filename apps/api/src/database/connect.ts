import mongoose from 'mongoose';

let transactionCapable = false;

export async function connectDatabase(uri: string): Promise<typeof mongoose> {
  mongoose.set('autoIndex', false);
  const connection = await mongoose.connect(uri, {
    maxPoolSize: 5,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 5_000,
  });
  try {
    if (!mongoose.connection.db) throw new Error('MongoDB connection chưa sẵn sàng.');
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    transactionCapable = typeof hello.setName === 'string' || hello.msg === 'isdbgrid';
    if (!transactionCapable) {
      throw new Error('MongoDB phải là replica set hoặc sharded cluster để hỗ trợ transaction.');
    }
    return connection;
  } catch (error) {
    transactionCapable = false;
    await mongoose.disconnect();
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  transactionCapable = false;
  await mongoose.disconnect();
}

export function isDatabaseReady(): boolean {
  return (
    transactionCapable && mongoose.connection.readyState === mongoose.ConnectionStates.connected
  );
}
