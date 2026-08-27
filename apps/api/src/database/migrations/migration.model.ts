import type { Db } from 'mongodb';

export interface DatabaseMigration {
  readonly id: string;
  readonly checksum: string;
  readonly description: string;
  up(database: Db): Promise<void>;
}

export interface AppliedMigration {
  readonly migrationId: string;
  readonly checksum: string;
  readonly description: string;
  readonly appliedAt: Date;
  readonly applicationVersion: string;
}
