import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HttpClient } from "../../src/api/http-client.js";
import { LunchMoneyAPIError } from "../../src/utils/errors.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function createJsonResponse(data: unknown, status = 200, ok = true) {
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    headers: new Headers({ "content-type": "application/json" }),
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
  };
}

/** V1-style error parser: reads { error: string } */
function v1ErrorParser(errorData: unknown): string | null {
  if (
    typeof errorData === "object" &&
    errorData !== null &&
    "error" in errorData &&
    typeof (errorData as Record<string, unknown>).error === "string"
  ) {
    return (errorData as Record<string, string>).error;
  }
  return null;
}

/** V2-style error parser: reads { message: string, errors: [{ errMsg }] } */
function v2ErrorParser(errorData: unknown): string | null {
  if (
    typeof errorData === "object" &&
    errorData !== null &&
    "message" in errorData &&
    typeof (errorData as Record<string, unknown>).message === "string"
  ) {
    const data = errorData as { message: string; errors?: Array<{ errMsg: string }> };
    const details = data.errors?.map((e) => e.errMsg).join("; ");
    return details ? `${data.message}: ${details}` : data.message;
  }
  return null;
}

describe("HttpClient", () => {
  let client: HttpClient;

  beforeEach(() => {
    mockFetch.mockReset();
    client = new HttpClient({
      baseUrl: "https://dev.lunchmoney.app/v1",
      accessToken: "test-token",
      parseError: v1ErrorParser,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("throws if no access token is provided", () => {
      expect(
        () => new HttpClient({ baseUrl: "https://example.com", accessToken: "", parseError: v1ErrorParser })
      ).toThrow("Access token is required");
    });

    it("creates client with valid params", () => {
      const c = new HttpClient({
        baseUrl: "https://example.com",
        accessToken: "token",
        parseError: v1ErrorParser,
      });
      expect(c).toBeInstanceOf(HttpClient);
    });
  });

  describe("get", () => {
    it("makes GET request to baseUrl + endpoint", async () => {
      const mockData = { user: { id: 1 } };
      mockFetch.mockResolvedValue(createJsonResponse(mockData));

      const result = await client.get("/me");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://dev.lunchmoney.app/v1/me",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
            "Content-Type": "application/json",
          }),
        })
      );
      expect(result).toEqual(mockData);
    });

    it("appends query params, omitting null/undefined", async () => {
      mockFetch.mockResolvedValue(createJsonResponse({ transactions: [] }));

      await client.get("/transactions", {
        start_date: "2024-01-01",
        end_date: undefined,
        category_id: null,
        limit: 10,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://dev.lunchmoney.app/v1/transactions?start_date=2024-01-01&limit=10",
        expect.objectContaining({ method: "GET" })
      );
    });
  });

  describe("post", () => {
    it("makes POST request with JSON body", async () => {
      const mockData = { tag: { id: 1, name: "test" } };
      mockFetch.mockResolvedValue(createJsonResponse(mockData));

      const result = await client.post("/tags", { name: "test" });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://dev.lunchmoney.app/v1/tags",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ name: "test" }),
        })
      );
      expect(result).toEqual(mockData);
    });

    it("makes POST request without body", async () => {
      mockFetch.mockResolvedValue(createJsonResponse(true));

      await client.post("/plaid_accounts/fetch");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://dev.lunchmoney.app/v1/plaid_accounts/fetch",
        expect.objectContaining({
          method: "POST",
          body: undefined,
        })
      );
    });
  });

  describe("put", () => {
    it("makes PUT request with body", async () => {
      const mockData = { tag: { id: 1, name: "updated" } };
      mockFetch.mockResolvedValue(createJsonResponse(mockData));

      const result = await client.put("/tags/1", { name: "updated" });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://dev.lunchmoney.app/v1/tags/1",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ name: "updated" }),
        })
      );
      expect(result).toEqual(mockData);
    });
  });

  describe("delete", () => {
    it("makes DELETE request", async () => {
      mockFetch.mockResolvedValue(createJsonResponse({}));

      await client.delete("/tags/1");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://dev.lunchmoney.app/v1/tags/1",
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  describe("error handling", () => {
    it("uses parseError to extract v1-style error message", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        headers: new Headers({ "content-type": "application/json" }),
        json: vi.fn().mockResolvedValue({ error: "Invalid API key" }),
        text: vi.fn().mockResolvedValue('{"error":"Invalid API key"}'),
      });

      await expect(client.get("/me")).rejects.toThrow("Invalid API key");
      await expect(client.get("/me")).rejects.toThrow(LunchMoneyAPIError);
    });

    it("uses parseError to extract v2-style error message", async () => {
      const v2Client = new HttpClient({
        baseUrl: "https://api.lunchmoney.dev/v2",
        accessToken: "test-token",
        parseError: v2ErrorParser,
      });

      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        headers: new Headers({ "content-type": "application/json" }),
        json: vi.fn().mockResolvedValue({
          message: "Invalid request",
          errors: [{ errMsg: "start_date is required" }],
        }),
        text: vi.fn().mockResolvedValue("{}"),
      });

      await expect(v2Client.get("/transactions")).rejects.toThrow(
        "Invalid request: start_date is required"
      );
    });

    it("falls back to statusText when JSON parsing fails", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        headers: new Headers({ "content-type": "text/plain" }),
        json: vi.fn().mockRejectedValue(new Error("Not JSON")),
        text: vi.fn().mockResolvedValue("Server error"),
      });

      await expect(client.get("/me")).rejects.toThrow(
        "API request failed: Internal Server Error"
      );
    });

    it("includes status code on LunchMoneyAPIError", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        headers: new Headers({ "content-type": "application/json" }),
        json: vi.fn().mockResolvedValue({ error: "Rate limited" }),
        text: vi.fn().mockResolvedValue('{"error":"Rate limited"}'),
      });

      try {
        await client.get("/me");
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(LunchMoneyAPIError);
        expect((err as LunchMoneyAPIError).statusCode).toBe(429);
      }
    });

    it("wraps network errors in LunchMoneyAPIError", async () => {
      mockFetch.mockRejectedValue(new Error("fetch failed"));
      await expect(client.get("/me")).rejects.toThrow("fetch failed");
    });

    it("wraps non-Error throws in LunchMoneyAPIError", async () => {
      mockFetch.mockRejectedValue("unexpected string");
      await expect(client.get("/me")).rejects.toThrow("Unknown error occurred");
    });

    it("returns empty object for non-JSON successful response", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 204,
        statusText: "No Content",
        headers: new Headers({ "content-type": "text/plain" }),
        json: vi.fn(),
        text: vi.fn().mockResolvedValue(""),
      });

      const result = await client.delete("/tags/1");
      expect(result).toEqual({});
    });
  });
});
