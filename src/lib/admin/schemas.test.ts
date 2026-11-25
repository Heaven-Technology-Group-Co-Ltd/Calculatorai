import { describe, it, expect } from "vitest";
import { sanitizeSearchTerm, isAllowedWebhookUrl } from "./schemas";

describe("sanitizeSearchTerm", () => {
  it("keeps a plain term unchanged", () => {
    expect(sanitizeSearchTerm("alice")).toBe("alice");
  });

  it("makes commas and parens literal via quoting", () => {
    // The route wraps the returned term in double quotes; the only char that
    // can break out is a double quote itself.
    const inject = ',is_admin.eq.true,id.ilike.%a(';
    const escaped = sanitizeSearchTerm(inject);
    expect(escaped).not.toContain('"');
    expect(escaped).toBe(inject);
  });

  it("doubles embedded double quotes so the quoting cannot be broken", () => {
    expect(sanitizeSearchTerm('a"b')).toBe('a""b');
    expect(sanitizeSearchTerm('%"},is_admin.eq.true')).toBe('%""},is_admin.eq.true');
  });
});

describe("isAllowedWebhookUrl", () => {
  it("accepts Discord webhook URLs", () => {
    expect(isAllowedWebhookUrl("https://discord.com/api/webhooks/123/abc")).toBe(true);
    expect(isAllowedWebhookUrl("https://discordapp.com/api/webhooks/123/abc")).toBe(true);
  });

  it("rejects non-Discord hosts, wrong paths, and non-https", () => {
    expect(isAllowedWebhookUrl("https://evil.example/api/webhooks/1/x")).toBe(false);
    expect(isAllowedWebhookUrl("https://discord.com/other/path")).toBe(false);
    expect(isAllowedWebhookUrl("http://discord.com/api/webhooks/1/x")).toBe(false);
    expect(isAllowedWebhookUrl("file:///etc/passwd")).toBe(false);
    expect(isAllowedWebhookUrl("not a url")).toBe(false);
  });
});
