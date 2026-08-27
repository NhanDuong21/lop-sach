import type { DutyWeek } from '@lop-sach/contracts';

const DATABASE_NAME = 'lop-sach-display-cache';
const DATABASE_VERSION = 1;
const STORE_NAME = 'current-week';
const CACHE_KEY = 'published-current-week';

export interface CachedCurrentWeek {
  readonly cacheSchemaVersion: 1;
  readonly cachedAt: string;
  readonly classroomName: string;
  readonly weekStart: string;
  readonly groupName: string;
  readonly status: 'PUBLISHED' | 'COMPLETED';
  readonly publicationRevision: number;
  readonly warningCount: number;
  readonly days: readonly {
    readonly date: string;
    readonly tasks: readonly {
      readonly taskName: string;
      readonly performers: readonly string[];
    }[];
  }[];
}

function indexedDatabase(): IDBFactory | null {
  return typeof indexedDB === 'undefined' ? null : indexedDB;
}

function openDatabase(): Promise<IDBDatabase | null> {
  const factory = indexedDatabase();
  if (!factory) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = factory.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME))
        request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Không mở được bộ nhớ ngoại tuyến.'));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  const database = await openDatabase();
  if (!database) return null;
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode);
      const request = operation(transaction.objectStore(STORE_NAME));
      let result: T;
      request.onsuccess = () => {
        result = request.result;
      };
      request.onerror = () => reject(request.error ?? new Error('Lỗi bộ nhớ ngoại tuyến.'));
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () =>
        reject(transaction.error ?? new Error('Lỗi giao dịch ngoại tuyến.'));
      transaction.onabort = () =>
        reject(transaction.error ?? new Error('Giao dịch ngoại tuyến bị hủy.'));
    });
  } finally {
    database.close();
  }
}

export function currentWeekDisplay(
  week: DutyWeek,
  classroomName: string,
): CachedCurrentWeek | null {
  if (week.status === 'DRAFT') return null;
  const dates = [
    ...new Set(week.taskOccurrences.filter((item) => item.enabled).map((item) => item.date)),
  ].sort();
  return {
    cacheSchemaVersion: 1,
    cachedAt: new Date().toISOString(),
    classroomName,
    weekStart: week.weekStart,
    groupName: week.groupSnapshot.name,
    status: week.status,
    publicationRevision: week.publicationRevision,
    warningCount: week.warnings.length,
    days: dates.map((date) => ({
      date,
      tasks: week.taskOccurrences
        .filter((occurrence) => occurrence.enabled && occurrence.date === date)
        .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id))
        .map((occurrence) => ({
          taskName: occurrence.taskName,
          performers: occurrence.slots.map((slot) => {
            const assignment = week.assignments.find((item) => item.slotId === slot.id);
            return (
              assignment?.actualStudentDisplayName ??
              assignment?.studentDisplayName ??
              'Chưa phân công'
            );
          }),
        })),
    })),
  };
}

export async function cacheCurrentWeek(week: DutyWeek, classroomName: string): Promise<void> {
  const display = currentWeekDisplay(week, classroomName);
  if (!display) return;
  await withStore('readwrite', (store) => store.put(display, CACHE_KEY));
}

export async function readCachedCurrentWeek(
  expectedWeekStart?: string,
): Promise<CachedCurrentWeek | null> {
  try {
    const value = await withStore<unknown>('readonly', (store) => store.get(CACHE_KEY));
    if (!value || typeof value !== 'object') return null;
    const candidate = value as Partial<CachedCurrentWeek>;
    if (
      candidate.cacheSchemaVersion !== 1 ||
      typeof candidate.weekStart !== 'string' ||
      !Array.isArray(candidate.days) ||
      (expectedWeekStart !== undefined && candidate.weekStart !== expectedWeekStart)
    )
      return null;
    return value as CachedCurrentWeek;
  } catch {
    return null;
  }
}

export async function clearOfflineCache(): Promise<void> {
  try {
    await withStore('readwrite', (store) => store.clear());
  } catch {
    // Local cleanup is best-effort when storage is unavailable or already removed.
  }
}
