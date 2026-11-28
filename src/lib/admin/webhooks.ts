export function maskWebhookUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length !== 4 || parts[0] !== "api" || parts[1] !== "webhooks") return "[redacted]";
    return `${parsed.origin}/api/webhooks/${parts[2]}/••••••••${parts[3].length > 4 ? parts[3].slice(-4) : ""}`;
  } catch {
    return "[redacted]";
  }
}

export function maskWebhook<T extends { url: string }>(webhook: T): T {
  return { ...webhook, url: maskWebhookUrl(webhook.url) };
}

export function distinctWebhooks<T extends { url: string }>(webhooks: T[]): T[] {
  const seen = new Set<string>();
  return webhooks.filter((webhook) => {
    if (seen.has(webhook.url)) return false;
    seen.add(webhook.url);
    return true;
  }).map(maskWebhook);
}
