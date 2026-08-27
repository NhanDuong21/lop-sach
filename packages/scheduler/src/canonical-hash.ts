import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { normalizeSchedulerContext } from './normalize.js';
import type { SchedulerContext } from './types.js';

export function canonicalJson(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value))
      throw new TypeError('Canonical JSON không chấp nhận số không hữu hạn.');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value === 'object') {
    const prototype = Object.getPrototypeOf(value) as unknown;
    if (prototype !== Object.prototype && prototype !== null)
      throw new TypeError('Canonical JSON chỉ chấp nhận plain object.');
    const record = value as Record<string, unknown>;
    const entries = Object.keys(record)
      .sort()
      .map((key) => {
        if (record[key] === undefined)
          throw new TypeError(`Canonical JSON không chấp nhận undefined tại ${key}.`);
        return `${JSON.stringify(key)}:${canonicalJson(record[key])}`;
      });
    return `{${entries.join(',')}}`;
  }
  throw new TypeError(`Canonical JSON không chấp nhận ${typeof value}.`);
}

export function sha256Hex(value: string): string {
  return bytesToHex(sha256(new TextEncoder().encode(value)));
}

export function schedulerInputHash(context: SchedulerContext): string {
  return sha256Hex(canonicalJson(normalizeSchedulerContext(context)));
}
