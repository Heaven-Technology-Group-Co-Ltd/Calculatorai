/**
 * In-process runtime health.
 *
 * One source of truth for `/api/health` and the `nextjs` service check on
 * `/api/status`, so neither has to call its own HTTP endpoint over the network.
 */
export interface RuntimeHealth {
  ok: boolean;
  uptimeSeconds: number;
}

export function getRuntimeHealth(): RuntimeHealth {
  const uptimeSeconds = process.uptime();
  return { ok: uptimeSeconds > 0, uptimeSeconds };
}
