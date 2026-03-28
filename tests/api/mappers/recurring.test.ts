import { describe, it, expect } from "vitest";
import { mapV2RecurringItemToV1 } from "../../../src/api/mappers/recurring.js";
import type { V2RecurringItem } from "../../../src/types/v2.js";

describe("Recurring item mappers", () => {
  describe("mapV2RecurringItemToV1", () => {
    it("flattens v2 nested structure into v1 flat shape", () => {
      const v2: V2RecurringItem = {
        id: 100,
        description: "Netflix subscription",
        status: "reviewed",
        transaction_criteria: {
          start_date: "2024-01-01",
          end_date: null,
          granularity: "month",
          quantity: 1,
          anchor_date: "2024-01-15",
          payee: "Netflix",
          amount: "15.99",
          to_base: 15.99,
          currency: "usd",
          plaid_account_id: null,
          manual_account_id: 42,
        },
        overrides: {
          payee: "Netflix Streaming",
          category_id: 10,
        },
        matches: {
          request_start_date: "2024-01-01",
          request_end_date: "2024-06-30",
          expected_occurrence_dates: ["2024-01-15", "2024-02-15"],
          found_transactions: [{ date: "2024-01-15", transaction_id: 500 }],
          missing_transaction_dates: ["2024-02-15"],
        },
        created_by: 1,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-06-01T00:00:00Z",
        source: "manual",
      };

      const result = mapV2RecurringItemToV1(v2);

      expect(result).toEqual({
        id: 100,
        payee: "Netflix Streaming",  // overrides.payee takes priority
        amount: "15.99",
        currency: "usd",
        category_id: 10,
        notes: "Netflix subscription",
        account_id: 42,
        frequency: "monthly",
        start_date: "2024-01-01",
        end_date: undefined,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-06-01T00:00:00Z",
      });
    });

    it("handles weekly frequency", () => {
      const v2: V2RecurringItem = {
        id: 1, description: "", status: "reviewed",
        transaction_criteria: {
          start_date: null, end_date: null, granularity: "week",
          quantity: 2, anchor_date: "2024-01-01", payee: null,
          amount: "10", to_base: 10, currency: "usd",
          plaid_account_id: 5, manual_account_id: null,
        },
        overrides: {},
        matches: null,
        created_by: 1, created_at: "", updated_at: "", source: null,
      };

      const result = mapV2RecurringItemToV1(v2);
      expect(result.frequency).toBe("every 2 weeks");
      expect(result.account_id).toBeUndefined();
    });

    it("handles yearly frequency", () => {
      const v2: V2RecurringItem = {
        id: 1, description: "", status: "reviewed",
        transaction_criteria: {
          start_date: null, end_date: null, granularity: "year",
          quantity: 1, anchor_date: "2024-01-01", payee: null,
          amount: "100", to_base: 100, currency: "usd",
          plaid_account_id: null, manual_account_id: null,
        },
        overrides: {},
        matches: null,
        created_by: 1, created_at: "", updated_at: "", source: null,
      };

      const result = mapV2RecurringItemToV1(v2);
      expect(result.frequency).toBe("yearly");
    });
  });
});
