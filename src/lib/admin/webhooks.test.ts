import { describe, expect, it } from "vitest";
import { maskWebhookUrl, distinctWebhooks } from "./webhooks";

describe("webhook projections", () => {
  it("hides secret tokens, query parameters and malformed URLs", () => {
    expect(maskWebhookUrl("https://discord.com/api/webhooks/123/abcdefghijkl?wait=true")).toBe("https://discord.com/api/webhooks/123/••••••••ijkl");
    expect(maskWebhookUrl("not a webhook secret")).toBe("[redacted]");
  });
  it("deduplicates by full stored URL before masking", () => {
    const webhooks = [{ id: 1, url: "https://discord.com/api/webhooks/123/abcdefgh" }, { id: 2, url: "https://discord.com/api/webhooks/123/abcdefgh" }, { id: 3, url: "https://discord.com/api/webhooks/123/zzzzefgh" }];
    expect(distinctWebhooks(webhooks).map((webhook) => webhook.id)).toEqual([1, 3]);
  });
});
