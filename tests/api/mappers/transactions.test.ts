import { describe, it, expect } from "vitest";
import {
  mapV2StatusToV1,
  mapV1StatusToV2,
  mapV1FilterParamsToV2,
  mapV2TransactionToMCP,
  mapMCPRequestToV2,
} from "../../../src/api/mappers/transactions.js";
import type { V2Transaction } from "../../../src/types/v2.js";

const sampleV2Transaction: V2Transaction = {
  id: 100,
  date: "2024-06-01",
  payee: "Starbucks",
  amount: "5.50",
  currency: "usd",
  notes: "Morning coffee",
  category_id: 10,
  recurring_id: null,
  manual_account_id: 42,
  plaid_account_id: null,
  status: "reviewed",
  is_group: false,
  group_id: null,
  parent_id: null,
  has_children: false,
  external_id: null,
  original_name: "STARBUCKS #1234",
  tags: [{ id: 1, name: "Food", description: "", text_color: "#000", background_color: "#fff", updated_at: "", created_at: "", archived: false, archived_at: null }],
  created_at: "2024-06-01T00:00:00Z",
  updated_at: "2024-06-01T00:00:00Z",
};

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

  describe("mapV2TransactionToMCP", () => {
    it("derives account_id from manual_account_id", () => {
      const result = mapV2TransactionToMCP(sampleV2Transaction);
      expect(result.account_id).toBe(42);
      expect(result.plaid_account_id).toBeUndefined();
    });

    it("derives account_id from plaid_account_id when no manual_account_id", () => {
      const result = mapV2TransactionToMCP({
        ...sampleV2Transaction,
        manual_account_id: null,
        plaid_account_id: 99,
      });
      expect(result.account_id).toBe(99);
      expect(result.plaid_account_id).toBe(99);
    });

    it("defaults account_id to 0 when neither account field is set", () => {
      const result = mapV2TransactionToMCP({
        ...sampleV2Transaction,
        manual_account_id: null,
        plaid_account_id: null,
      });
      expect(result.account_id).toBe(0);
    });

    it("maps status from v2 to v1", () => {
      expect(mapV2TransactionToMCP(sampleV2Transaction).status).toBe("cleared");
      expect(mapV2TransactionToMCP({ ...sampleV2Transaction, status: "unreviewed" }).status).toBe("uncleared");
    });

    it("converts null fields to undefined", () => {
      const result = mapV2TransactionToMCP({
        ...sampleV2Transaction,
        notes: null,
        category_id: null,
        group_id: null,
        external_id: null,
        original_name: null,
        tags: null,
      });
      expect(result.notes).toBeUndefined();
      expect(result.category_id).toBeUndefined();
      expect(result.group_id).toBeUndefined();
      expect(result.external_id).toBeUndefined();
      expect(result.original_name).toBeUndefined();
      expect(result.tags).toBeUndefined();
    });

    it("maps v2 tags to MCP tag shape (id + name only)", () => {
      const result = mapV2TransactionToMCP(sampleV2Transaction);
      expect(result.tags).toEqual([{ id: 1, name: "Food" }]);
    });
  });

  describe("mapMCPRequestToV2", () => {
    it("maps account_id to manual_account_id", () => {
      const result = mapMCPRequestToV2({
        date: "2024-06-01",
        amount: "5.50",
        account_id: 42,
      });
      expect(result.manual_account_id).toBe(42);
      expect(result).not.toHaveProperty("account_id");
    });

    it("maps status from v1 to v2", () => {
      const result = mapMCPRequestToV2({ status: "cleared" });
      expect(result.status).toBe("reviewed");
    });

    it("drops unmappable status", () => {
      const result = mapMCPRequestToV2({ status: "recurring" });
      expect(result.status).toBeUndefined();
    });

    it("does not override existing v2-specific account fields", () => {
      const result = mapMCPRequestToV2({
        account_id: 42,
        manual_account_id: 99,
      });
      // account_id should not override existing manual_account_id
      expect(result.manual_account_id).toBe(99);
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
    });

    it("passes through params without status", () => {
      const result = mapV1FilterParamsToV2({
        start_date: "2024-01-01",
        limit: 100,
      });
      expect(result).toEqual({ start_date: "2024-01-01", limit: 100 });
    });

    it("throws on unmappable status filter", () => {
      expect(() => mapV1FilterParamsToV2({ status: "recurring" })).toThrow(
        "Status filter 'recurring' is not supported by the v2 API"
      );
      expect(() => mapV1FilterParamsToV2({ status: "recurring_suggested" })).toThrow(
        "Status filter 'recurring_suggested' is not supported by the v2 API"
      );
    });

    it("maps pending to include_pending", () => {
      const result = mapV1FilterParamsToV2({ pending: true });
      expect(result.include_pending).toBe(true);
      expect(result).not.toHaveProperty("pending");
    });

    it("maps account_id to manual_account_id", () => {
      const result = mapV1FilterParamsToV2({ account_id: 42 });
      expect(result.manual_account_id).toBe(42);
      expect(result).not.toHaveProperty("account_id");
    });
  });
});
