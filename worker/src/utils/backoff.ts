export function calculateBackoffMs(
  retryCount: number
): number {
  const base = 1000; // 1s
  const max = 5 * 60 * 1000; // 5 minutes

  const delay = Math.min(
    base * Math.pow(2, retryCount),
    max
  );

  return delay;
}
