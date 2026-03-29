import { describe, it, expect } from "vitest";
import { mapV2PlaidAccountToMCP } from "../../../src/api/mappers/plaid.js";
import type { V2PlaidAccount } from "../../../src/types/v2.js";

describe("mapV2PlaidAccountToMCP", () => {
  const baseV2Account: V2PlaidAccount = {
    id: 1,
    plaid_item_id: "12345",
    date_linked: "2024-01-15",
    linked_by_name: "John Doe",
    name: "Checking Account",
    display_name: "My Checking",
    type: "depository",
    subtype: "checking",
    mask: "1234",
    institution_name: "Chase",
    status: "active",
    allow_transaction_modifications: true,
    limit: null,
    balance: "1500.00",
    currency: "usd",
    to_base: 1,
    balance_last_update: "2024-01-20T12:00:00Z",
    import_start_date: "2024-01-01",
    last_import: "2024-01-20",
    last_fetch: "2024-01-20T12:00:00Z",
    plaid_last_successful_update: "2024-01-20T12:00:00Z",
  };

  it("maps a v2 plaid account to MCP format", () => {
    const result = mapV2PlaidAccountToMCP(baseV2Account);

    expect(result.id).toBe(1);
    expect(result.plaid_item_id).toBe(12345);
    expect(result.date_linked).toBe("2024-01-15");
    expect(result.name).toBe("Checking Account");
    expect(result.display_name).toBe("My Checking");
    expect(result.type).toBe("depository");
    expect(result.subtype).toBe("checking");
    expect(result.mask).toBe("1234");
    expect(result.institution_name).toBe("Chase");
    expect(result.status).toBe("active");
    expect(result.balance).toBe("1500.00");
    expect(result.currency).toBe("usd");
    expect(result.balance_last_update).toBe("2024-01-20T12:00:00Z");
    expect(result.limit).toBeUndefined();
    expect(result.linked_by_name).toBe("John Doe");
    expect(result.allow_transaction_modifications).toBe(true);
    expect(result.to_base).toBe(1);
    expect(result.import_start_date).toBe("2024-01-01");
    expect(result.last_import).toBe("2024-01-20");
    expect(result.last_fetch).toBe("2024-01-20T12:00:00Z");
    expect(result.plaid_last_successful_update).toBe("2024-01-20T12:00:00Z");
  });

  it("converts numeric plaid_item_id string to number", () => {
    const result = mapV2PlaidAccountToMCP({ ...baseV2Account, plaid_item_id: "98765" });
    expect(result.plaid_item_id).toBe(98765);
  });

  it("returns undefined for non-numeric plaid_item_id", () => {
    const result = mapV2PlaidAccountToMCP({ ...baseV2Account, plaid_item_id: "abc" });
    expect(result.plaid_item_id).toBeUndefined();
  });

  it("passes through limit when present", () => {
    const result = mapV2PlaidAccountToMCP({ ...baseV2Account, limit: 5000 });
    expect(result.limit).toBe(5000);
  });
});
