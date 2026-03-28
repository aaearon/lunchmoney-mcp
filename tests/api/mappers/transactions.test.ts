import { describe, it, expect } from "vitest";
import {
  mapV2StatusToV1,
  mapV1StatusToV2,
  mapV1FilterParamsToV2,
} from "../../../src/api/mappers/transactions.js";

describe("Transaction mappers", () => {
  describe("mapV2StatusToV1", () => {
    it("maps reviewed to cleared", () => {
      expect(mapV2StatusToV1("reviewed")).toBe("cleared");
    });

    it("maps unreviewed to uncleared", () => {
      expect(mapV2StatusToV1("unreviewed")).toBe("uncleared");
    });

    it("passes through delete_pending", () => {
      expect(mapV2StatusToV1("delete_pending")).toBe("delete_pending");
    });
  });

  describe("mapV1StatusToV2", () => {
    it("maps cleared to reviewed", () => {
      expect(mapV1StatusToV2("cleared")).toBe("reviewed");
    });

    it("maps uncleared to unreviewed", () => {
      expect(mapV1StatusToV2("uncleared")).toBe("unreviewed");
    });

    it("passes through v2-native values", () => {
      expect(mapV1StatusToV2("reviewed")).toBe("reviewed");
      expect(mapV1StatusToV2("unreviewed")).toBe("unreviewed");
    });

    it("returns undefined for v1-only values that have no v2 equivalent", () => {
      expect(mapV1StatusToV2("recurring")).toBeUndefined();
      expect(mapV1StatusToV2("recurring_suggested")).toBeUndefined();
    });
  });

  describe("mapV1FilterParamsToV2", () => {
    it("translates status in filter params", () => {
      const result = mapV1FilterParamsToV2({
        start_date: "2024-01-01",
        end_date: "2024-01-31",
        status: "cleared",
      });

      expect(result.status).toBe("reviewed");
      expect(result.start_date).toBe("2024-01-01");
      expect(result.end_date).toBe("2024-01-31");
    });

    it("passes through params without status", () => {
      const result = mapV1FilterParamsToV2({
        start_date: "2024-01-01",
        limit: 100,
      });

      expect(result).toEqual({
        start_date: "2024-01-01",
        limit: 100,
      });
    });

    it("removes status if v1-only value has no v2 mapping", () => {
      const result = mapV1FilterParamsToV2({
        status: "recurring",
      });

      expect(result.status).toBeUndefined();
    });

    it("maps pending to include_pending and is_pending", () => {
      const result = mapV1FilterParamsToV2({
        pending: true,
      });

      expect(result.include_pending).toBe(true);
      expect(result).not.toHaveProperty("pending");
    });

    it("maps account_id to manual_account_id", () => {
      const result = mapV1FilterParamsToV2({
        account_id: 42,
      });

      expect(result.manual_account_id).toBe(42);
      expect(result).not.toHaveProperty("account_id");
    });
  });
});
