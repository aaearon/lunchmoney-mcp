import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createV1Client, V1_BASE_URL, parseV1Error } from "../../src/api/v1-client.js";
import { HttpClient } from "../../src/api/http-client.js";
import { LunchMoneyAPIError } from "../../src/utils/errors.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("V1 Client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("createV1Client", () => {
    it("returns an HttpClient instance", () => {
      const client = createV1Client("test-token");
      expect(client).toBeInstanceOf(HttpClient);
    });

    it("uses the v1 base URL", async () => {
      const client = createV1Client("test-token");
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: vi.fn().mockResolvedValue({ id: 1 }),
      });

      await client.get("/me");

      expect(mockFetch).toHaveBeenCalledWith(
        `${V1_BASE_URL}/me`,
        expect.anything()
      );
    });
  });

  describe("parseV1Error", () => {
    it("extracts error message from v1 format", () => {
      expect(parseV1Error({ error: "Invalid API key" })).toBe("Invalid API key");
    });

    it("returns null for non-v1 error format", () => {
      expect(parseV1Error({ message: "some error" })).toBeNull();
      expect(parseV1Error(null)).toBeNull();
      expect(parseV1Error("string")).toBeNull();
      expect(parseV1Error({ error: 123 })).toBeNull();
    });
  });

  describe("V1_BASE_URL", () => {
    it("points to dev.lunchmoney.app/v1", () => {
      expect(V1_BASE_URL).toBe("https://dev.lunchmoney.app/v1");
    });
  });
});
