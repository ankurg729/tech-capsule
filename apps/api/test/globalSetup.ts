import { MongoMemoryServer } from 'mongodb-memory-server';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    mongoUri: string;
  }
}

let server: MongoMemoryServer | undefined;

/**
 * Uses MONGODB_TEST_URI when provided (e.g. a local mongod or CI service). Otherwise starts an
 * in-memory server; set MONGOMS_SYSTEM_BINARY to reuse an installed mongod instead of downloading.
 */
export default async function setup(project: TestProject) {
  let uri = process.env.MONGODB_TEST_URI;
  if (!uri) {
    server = await MongoMemoryServer.create();
    uri = server.getUri();
  }
  project.provide('mongoUri', uri);
  return async () => {
    await server?.stop();
  };
}
