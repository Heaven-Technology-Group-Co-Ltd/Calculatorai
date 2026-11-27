interface BurstLimiterOptions {
  max: number;
  windowMs: number;
  maxClients: number;
}

export function createBurstLimiter({ max, windowMs, maxClients }: BurstLimiterOptions) {
  const clients = new Map<string, number[]>();

  return (client: string, now = Date.now()): { allowed: boolean; retryAfter: number } => {
    const hits = (clients.get(client) ?? []).filter((hit) => now - hit < windowMs);
    if (hits.length >= max) {
      return { allowed: false, retryAfter: Math.max(1, Math.ceil((windowMs - now + hits[0]) / 1000)) };
    }
    hits.push(now);
    clients.delete(client);
    if (clients.size >= maxClients) {
      const oldest = clients.keys().next();
      if (!oldest.done) clients.delete(oldest.value);
    }
    clients.set(client, hits);
    return { allowed: true, retryAfter: 0 };
  };
}
