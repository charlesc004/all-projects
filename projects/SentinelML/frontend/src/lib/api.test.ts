import { describe, expect, it, vi, afterEach } from "vitest";
import { api, money, setCSRF, timestamp } from "./api";
afterEach(() => vi.unstubAllGlobals());
describe("API client", () => {
  it("propagates session credentials and the CSRF token", async () => {
    setCSRF("test-csrf");
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "accepted" }), {
        status: 202,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetcher);
    expect(
      await api("/demo/transactions", { method: "POST", body: "{}" }),
    ).toEqual({ status: "accepted" });
    expect(fetcher).toHaveBeenCalledWith(
      "/api/demo/transactions",
      expect.objectContaining({
        credentials: "same-origin",
        headers: expect.objectContaining({ "X-CSRF-Token": "test-csrf" }),
      }),
    );
  });
  it("surfaces backend authorization errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "permission denied" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    await expect(api("/policies")).rejects.toThrow("permission denied");
  });
  it("formats currency and UTC consistently", () => {
    expect(money(125)).toBe("$125.00");
    expect(timestamp("2026-01-01T12:00:00Z")).toContain("12:00 UTC");
  });
});
