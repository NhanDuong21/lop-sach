export const SCHEDULER_ENGINE_VERSION = '1.0.0';

export * from './canonical-hash.js';
export * from './eligibility.js';
export * from './generate.js';
export * from './normalize.js';
export * from './seed.js';
export * from './types.js';
export * from './validate.js';

export class SchedulerVersionOutdatedError extends Error {
  public readonly code = 'SCHEDULER_VERSION_OUTDATED';
  public readonly action = 'RELOAD_REQUIRED';
  public constructor(public readonly serverSchedulerEngineVersion: string) {
    super('Client scheduler version is outdated.');
  }
}

export function assertSchedulerVersion(clientVersion: string): void {
  if (clientVersion !== SCHEDULER_ENGINE_VERSION)
    throw new SchedulerVersionOutdatedError(SCHEDULER_ENGINE_VERSION);
}
