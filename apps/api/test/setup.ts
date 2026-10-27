import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll, inject } from 'vitest';
import { devOutbox } from '../src/integrations/email/index.js';

beforeAll(async () => {
  const base = inject('mongoUri');
  const url = new URL(base);
  // Each worker gets its own database so test files can run in parallel.
  url.pathname = `/techcapsule_test_${process.env.VITEST_POOL_ID ?? process.env.VITEST_WORKER_ID ?? '0'}`;
  await mongoose.connect(url.toString());
  await mongoose.connection.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map((m) => m.createIndexes()));
});

afterEach(async () => {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
  devOutbox?.clear();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
