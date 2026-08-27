import type { HistoryMetric, HistorySummaryItem } from '@lop-sach/contracts';
import { apiRequest } from '../../lib/api-client.js';

export async function getHistorySummary(): Promise<readonly HistorySummaryItem[]> {
  return (await apiRequest<{ data: HistorySummaryItem[] }>('/history/summary')).data;
}

export async function getHistoryMetrics(): Promise<readonly HistoryMetric[]> {
  return (await apiRequest<{ data: HistoryMetric[] }>('/history/metrics')).data;
}
