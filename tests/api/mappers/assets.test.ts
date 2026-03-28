import { describe, it, expect } from "vitest";
import {
  mapManualAccountToAsset,
  mapAssetRequestToManualAccountRequest,
} from "../../../src/api/mappers/assets.js";
import type { ManualAccount } from "../../../src/types/v2.js";

describe("Asset mappers", () => {
  describe("mapManualAccountToAsset", () => {
    it("maps manual account to MCP Asset type", () => {
      const manualAccount: ManualAccount = {
        id: 42,
        name: "Savings",
        institution_name: "Chase",
        display_name: "Chase Savings",
        type: "cash",
        subtype: "savings",
        balance: "10000.0000",
        currency: "usd",
        to_base: 10000,
        balance_as_of: "2024-06-01T00:00:00Z",
        status: "active",
        closed_on: null,
        external_id: null,
        exclude_from_transactions: false,
        created_by_name: "Test User",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-06-01T00:00:00Z",
      };

      const asset = mapManualAccountToAsset(manualAccount);

      expect(asset).toEqual({
        id: 42,
        type_name: "cash",
        name: "Savings",
        balance: "10000.0000",
        balance_as_of: "2024-06-01T00:00:00Z",
        currency: "usd",
        institution_name: "Chase",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-06-01T00:00:00Z",
      });
    });

    it("handles all manual account types", () => {
      const types = [
        "cash", "credit", "cryptocurrency", "employee compensation",
        "investment", "loan", "other liability", "other asset",
        "real estate", "vehicle",
      ] as const;

      for (const type of types) {
        const account = {
          id: 1, name: "Test", institution_name: "", display_name: "",
          type, subtype: "", balance: "0", currency: "usd", to_base: 0,
          balance_as_of: "", status: "active" as const, closed_on: null,
          external_id: null, exclude_from_transactions: false,
          created_by_name: "", created_at: "", updated_at: "",
        };
        const asset = mapManualAccountToAsset(account);
        expect(asset.type_name).toBe(type);
      }
    });
  });

  describe("mapAssetRequestToManualAccountRequest", () => {
    it("maps type_name to type", () => {
      const result = mapAssetRequestToManualAccountRequest({
        type_name: "investment",
        name: "401k",
        balance: "50000",
        currency: "usd",
        institution_name: "Vanguard",
      });

      expect(result).toEqual({
        type: "investment",
        name: "401k",
        balance: "50000",
        currency: "usd",
        institution_name: "Vanguard",
      });
    });

    it("omits type_name_override", () => {
      const result = mapAssetRequestToManualAccountRequest({
        type_name: "cash",
        type_name_override: "Custom Type",
        name: "Test",
      });

      expect(result.type).toBe("cash");
      expect(result).not.toHaveProperty("type_name_override");
      expect(result).not.toHaveProperty("type_name");
    });
  });
});
