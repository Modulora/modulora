import { describe, expect, it, vi } from "vitest";

import { fetchWithManualRedirects } from "../src/lib/manual-redirect-fetch";

describe("fetchWithManualRedirects", () => {
  it("uses Workers-compatible manual redirects and validates every destination", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "https://cdn.example.com/card.png" } }))
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { "content-type": "image/png" } }));
    const validated: string[] = [];

    const result = await fetchWithManualRedirects({
      inputUrl: new URL("https://example.com/card"),
      validateUrl: (url) => { validated.push(url.toString()); return url.protocol === "https:"; },
      fetcher: fetcher as typeof fetch,
    });

    expect(result?.url.toString()).toBe("https://cdn.example.com/card.png");
    expect(result?.response.status).toBe(200);
    expect(validated).toEqual(["https://example.com/card", "https://cdn.example.com/card.png"]);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls.every(([, init]) => init?.redirect === "manual")).toBe(true);
  });

  it("fails closed before fetching a redirect that violates URL policy", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: "http://private.example/card.png" } }));
    const result = await fetchWithManualRedirects({
      inputUrl: new URL("https://example.com/card"),
      validateUrl: (url) => url.protocol === "https:",
      fetcher: fetcher as typeof fetch,
    });

    expect(result).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
