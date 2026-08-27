export function fnv1a32(value: string): number {
  const bytes = new TextEncoder().encode(value);
  let hash = 0x811c9dc5;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function candidateTieValue(seed: string, slotId: string, studentId: string): number {
  return fnv1a32(`${seed}|${slotId}|${studentId}`);
}
