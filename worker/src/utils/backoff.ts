export function backoff(retryCount: number): number {
  return Math.min(1000 * Math.pow(2, retryCount), 30000);
}
