import { describe, expect, it } from "vitest";
import { GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD } from "./route";

const handlers = { GET, POST, PUT, PATCH, DELETE, OPTIONS };

describe("/api/[...path] catch-all", () => {
  for (const [name, handler] of Object.entries(handlers)) {
    it(`answers ${name} with a JSON 404`, async () => {
      const res = await handler();

      expect(res.status).toBe(404);
      expect(res.headers.get("content-type")).toContain("application/json");
      await expect(res.json()).resolves.toEqual({ error: "Not found" });
    });
  }

  it("answers HEAD with a 404 and no body", async () => {
    const res = await HEAD();

    expect(res.status).toBe(404);
    await expect(res.text()).resolves.toBe("");
  });
});
