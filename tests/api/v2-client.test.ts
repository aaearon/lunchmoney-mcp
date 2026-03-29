import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createV2Client, V2_BASE_URL, parseV2Error } from "../../src/api/v2-client.js";
import { HttpClient } from "../../src/api/http-client.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("V2 Client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("createV2Client", () => {
    it("returns an HttpClient instance", () => {
      const client = createV2Client("test-token");
      expect(client).toBeInstanceOf(HttpClient);
    });

    it("uses the v2 base URL", async () => {
      const client = createV2Client("test-token");
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: vi.fn().mockResolvedValue({ id: 1 }),
      });

      await client.get("/me");

      expect(mockFetch).toHaveBeenCalledWith(
        `${V2_BASE_URL}/me`,
        expect.anything()
      );
    });
  });

  describe("parseV2Error", () => {
    it("extracts message with error details", () => {
      expect(
        parseV2Error({
          message: "Invalid request",
          errors: [{ errMsg: "start_date is required" }, { errMsg: "end_date is required" }],
        })
      ).toBe("Invalid request: start_date is required; end_date is required");
    });

    it("extracts message without error details", () => {
      expect(parseV2Error({ message: "Unauthorized" })).toBe("Unauthorized");
      expect(parseV2Error({ message: "Unauthorized", errors: [] })).toBe("Unauthorized");
    });

    it("returns null for non-v2 error format", () => {
      expect(parseV2Error({ error: "Invalid API key" })).toBeNull();
      expect(parseV2Error(null)).toBeNull();
      expect(parseV2Error("string")).toBeNull();
      expect(parseV2Error({ message: 123 })).toBeNull();
    });
  });

  describe("V2_BASE_URL", () => {
    it("points to api.lunchmoney.dev/v2", () => {
      expect(V2_BASE_URL).toBe("https://api.lunchmoney.dev/v2");
    });
  });
});
