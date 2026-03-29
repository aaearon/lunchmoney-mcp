import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApiFacade } from "../../src/api/facade.js";
import { LunchMoneyAPIError } from "../../src/utils/errors.js";
import type { HttpClient } from "../../src/api/http-client.js";

function createMockHttpClient(): { [K in "get" | "post" | "put" | "delete"]: ReturnType<typeof vi.fn> } {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
}

describe("createApiFacade", () => {
  let v1: ReturnType<typeof createMockHttpClient>;
  let v2: ReturnType<typeof createMockHttpClient>;
  let api: ReturnType<typeof createApiFacade>;

  beforeEach(() => {
    v1 = createMockHttpClient();
    v2 = createMockHttpClient();
    api = createApiFacade(v1 as unknown as HttpClient, v2 as unknown as HttpClient);
  });

  // --- User ---
  describe("user", () => {
    it("get remaps v2 user fields to MCP format", async () => {
      v2.get.mockResolvedValue({
        user_id: 42,
        user_email: "test@example.com",
        user_name: "Test User",
        primary_currency: "usd",
      });

      const result = await api.user.get();

      expect(v2.get).toHaveBeenCalledWith("/me");
      expect(result).toEqual({
        id: 42,
        email: "test@example.com",
        name: "Test User",
        currency: "usd",
      });
    });
  });

  // --- Categories ---
  describe("categories", () => {
    const v2Category = {
      id: 1, name: "Food", description: null,
      is_income: false, exclude_from_budget: true, exclude_from_totals: false,
      updated_at: "2024-01-01", created_at: "2024-01-01",
      group_id: null, is_group: false, archived: false, archived_at: null,
      order: 0, collapsed: false,
    };

    const v2GroupCategory = {
      ...v2Category, id: 10, name: "Essentials", is_group: true,
      children: [{ ...v2Category, id: 1, group_id: 10 }],
    };

    it("list maps v2 categories and extracts groups", async () => {
      v2.get.mockResolvedValue({ categories: [v2GroupCategory, v2Category] });

      const result = await api.categories.list();

      expect(v2.get).toHaveBeenCalledWith("/categories");
      expect(result.categories).toHaveLength(2);
      expect(result.categories[0].name).toBe("Essentials");
      expect(result.category_groups).toBeDefined();
    });

    it("get fetches a single category via v2", async () => {
      v2.get.mockResolvedValue(v2Category);

      const result = await api.categories.get(1);

      expect(v2.get).toHaveBeenCalledWith("/categories/1");
      expect(result.name).toBe("Food");
    });

    it("create maps request and response via v2", async () => {
      v2.post.mockResolvedValue(v2Category);

      const result = await api.categories.create({ name: "Food" });

      expect(v2.post).toHaveBeenCalledWith("/categories", expect.any(Object));
      expect(result.category.name).toBe("Food");
    });

    it("update maps request and response via v2", async () => {
      v2.put.mockResolvedValue(v2Category);

      const result = await api.categories.update(1, { name: "Food" });

      expect(v2.put).toHaveBeenCalledWith("/categories/1", expect.any(Object));
      expect(result.category.name).toBe("Food");
    });

    it("delete routes to v2", async () => {
      v2.delete.mockResolvedValue(undefined);

      await api.categories.delete(1);

      expect(v2.delete).toHaveBeenCalledWith("/categories/1");
    });

    it("createGroup posts to v2 and returns group shape", async () => {
      v2.post.mockResolvedValue({ ...v2GroupCategory });

      const result = await api.categories.createGroup({ name: "Essentials", children: [1] });

      expect(v2.post).toHaveBeenCalledWith("/categories", expect.any(Object));
      expect(result.category_group).toEqual({
        id: 10, name: "Essentials", created_at: "2024-01-01",
      });
    });

    it("addToGroup fetches existing children then merges", async () => {
      v2.get.mockResolvedValue({ ...v2GroupCategory, children: [{ id: 1 }, { id: 2 }] });
      v2.put.mockResolvedValue({});

      await api.categories.addToGroup(10, { new_categories: [3] });

      expect(v2.get).toHaveBeenCalledWith("/categories/10");
      expect(v2.put).toHaveBeenCalledWith("/categories/10", expect.objectContaining({
        children: expect.arrayContaining([1, 2]),
      }));
    });
  });

  // --- Tags ---
  describe("tags", () => {
    const v2Tag = {
      id: 1, name: "travel", description: null,
      text_color: "#000", background_color: "#fff",
      archived: false, archived_at: null,
    };

    it("list maps v2 tags", async () => {
      v2.get.mockResolvedValue({ tags: [v2Tag] });

      const result = await api.tags.list();

      expect(v2.get).toHaveBeenCalledWith("/tags");
      expect(result.tags).toHaveLength(1);
      expect(result.tags[0].name).toBe("travel");
    });

    it("create routes to v2 and maps response", async () => {
      v2.post.mockResolvedValue(v2Tag);

      const result = await api.tags.create({ name: "travel" });

      expect(v2.post).toHaveBeenCalledWith("/tags", { name: "travel" });
      expect(result.tag.name).toBe("travel");
    });

    it("update routes to v2 and maps response", async () => {
      v2.put.mockResolvedValue(v2Tag);

      const result = await api.tags.update(1, { name: "travel" });

      expect(v2.put).toHaveBeenCalledWith("/tags/1", { name: "travel" });
      expect(result.tag.name).toBe("travel");
    });

    it("delete routes to v2", async () => {
      v2.delete.mockResolvedValue(undefined);

      await api.tags.delete(1);

      expect(v2.delete).toHaveBeenCalledWith("/tags/1");
    });
  });

  // --- Transactions ---
  describe("transactions", () => {
    const v2Transaction = {
      id: 1, date: "2024-01-15", payee: "Store", amount: "50.00",
      currency: "usd", notes: null, category_id: 5,
      plaid_account_id: null, manual_account_id: 10,
      status: "reviewed", is_group: false, group_id: null,
      external_id: null, original_name: null, tags: null,
      created_at: "2024-01-15T00:00:00Z", updated_at: "2024-01-15T00:00:00Z",
      to_base: 50, recurring_id: null, is_pending: false,
      split_parent_id: null, is_group_parent: false, group_parent_id: null,
      source: "manual",
    };

    it("list maps filter params and response via v2", async () => {
      v2.get.mockResolvedValue({ transactions: [v2Transaction] });

      const result = await api.transactions.list({ status: "cleared" });

      expect(v2.get).toHaveBeenCalledWith("/transactions", expect.objectContaining({ status: "reviewed" }));
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].status).toBe("cleared");
    });

    it("list passes no params when called without args", async () => {
      v2.get.mockResolvedValue({ transactions: [] });

      await api.transactions.list();

      expect(v2.get).toHaveBeenCalledWith("/transactions", undefined);
    });

    it("get fetches single transaction via v2", async () => {
      v2.get.mockResolvedValue(v2Transaction);

      const result = await api.transactions.get(1);

      expect(v2.get).toHaveBeenCalledWith("/transactions/1");
      expect(result.payee).toBe("Store");
    });

    it("create wraps in array and maps response via v2", async () => {
      v2.post.mockResolvedValue({ transactions: [v2Transaction] });

      const result = await api.transactions.create({ payee: "Store", amount: "50.00" });

      expect(v2.post).toHaveBeenCalledWith("/transactions", {
        transactions: [expect.any(Object)],
      });
      expect(result.transaction.payee).toBe("Store");
    });

    it("create throws when response has no transactions", async () => {
      v2.post.mockResolvedValue({ transactions: [] });

      await expect(api.transactions.create({ payee: "Store" })).rejects.toThrow(LunchMoneyAPIError);
      await expect(api.transactions.create({ payee: "Store" })).rejects.toThrow(
        "Transaction creation succeeded but no transaction was returned"
      );
    });

    it("update maps request and response via v2", async () => {
      v2.put.mockResolvedValue(v2Transaction);

      const result = await api.transactions.update(1, { payee: "New Store" });

      expect(v2.put).toHaveBeenCalledWith("/transactions/1", expect.any(Object));
      expect(result.transaction.payee).toBe("Store");
    });

    it("delete routes to v2", async () => {
      v2.delete.mockResolvedValue(undefined);

      await api.transactions.delete(1);

      expect(v2.delete).toHaveBeenCalledWith("/transactions/1");
    });

    it("bulkUpdate maps status and routes to v2", async () => {
      v2.put.mockResolvedValue({ updated: 3 });

      const result = await api.transactions.bulkUpdate({ status: "cleared", transaction_ids: [1, 2, 3] });

      expect(v2.put).toHaveBeenCalledWith("/transactions", expect.objectContaining({ status: "reviewed" }));
      expect(result.updated).toBe(3);
    });

    it("bulkUpdate strips unmappable status", async () => {
      v2.put.mockResolvedValue({ updated: 1 });

      await api.transactions.bulkUpdate({ status: "recurring", transaction_ids: [1] });

      const callArgs = v2.put.mock.calls[0][1] as Record<string, unknown>;
      expect(callArgs.status).toBeUndefined();
    });

    it("getGroup routes to v2", async () => {
      v2.get.mockResolvedValue(v2Transaction);

      const result = await api.transactions.getGroup(1);

      expect(v2.get).toHaveBeenCalledWith("/transactions/group/1");
      expect(result.payee).toBe("Store");
    });

    it("createGroup routes to v2", async () => {
      v2.post.mockResolvedValue(v2Transaction);

      const result = await api.transactions.createGroup({ transaction_ids: [1, 2] });

      expect(v2.post).toHaveBeenCalledWith("/transactions/group", { transaction_ids: [1, 2] });
      expect(result.payee).toBe("Store");
    });

    it("deleteGroup routes to v2", async () => {
      v2.delete.mockResolvedValue(undefined);

      await api.transactions.deleteGroup(1);

      expect(v2.delete).toHaveBeenCalledWith("/transactions/group/1");
    });

    it("unsplit routes to v2", async () => {
      v2.post.mockResolvedValue({});

      await api.transactions.unsplit({ parent_ids: [1] });

      expect(v2.post).toHaveBeenCalledWith("/transactions/unsplit", { parent_ids: [1] });
    });
  });

  // --- Recurring ---
  describe("recurring", () => {
    const v2Recurring = {
      id: 1, description: "Netflix", status: "reviewed",
      transaction_criteria: {
        start_date: "2024-01-01", end_date: null, granularity: "month",
        quantity: 1, anchor_date: "2024-01-15", payee: "Netflix",
        amount: "15.99", to_base: 15.99, currency: "usd",
        plaid_account_id: null, manual_account_id: 42,
      },
      overrides: {}, matches: null,
      created_by: 1, created_at: "2024-01-01", updated_at: "2024-01-01", source: null,
    };

    it("list routes to v2 and maps response", async () => {
      v2.get.mockResolvedValue({ recurring_items: [v2Recurring] });

      const result = await api.recurring.list();

      expect(v2.get).toHaveBeenCalledWith("/recurring_items");
      expect(result.recurring_items).toHaveLength(1);
      expect(result.recurring_items[0].frequency).toBe("monthly");
    });

    it("create routes to v1", async () => {
      const mockResponse = { recurring_expense: { id: 1 } };
      v1.post.mockResolvedValue(mockResponse);

      const result = await api.recurring.create({ payee: "Netflix" });

      expect(v1.post).toHaveBeenCalledWith("/recurring_expenses", { payee: "Netflix" });
      expect(v2.post).not.toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });

    it("update routes to v1", async () => {
      const mockResponse = { recurring_expense: { id: 1 } };
      v1.put.mockResolvedValue(mockResponse);

      const result = await api.recurring.update(1, { payee: "Netflix" });

      expect(v1.put).toHaveBeenCalledWith("/recurring_expenses/1", { payee: "Netflix" });
      expect(v2.put).not.toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });

    it("delete routes to v1", async () => {
      v1.delete.mockResolvedValue(undefined);

      await api.recurring.delete(1);

      expect(v1.delete).toHaveBeenCalledWith("/recurring_expenses/1");
      expect(v2.delete).not.toHaveBeenCalled();
    });
  });

  // --- Budgets ---
  describe("budgets", () => {
    it("list routes to v1", async () => {
      const mockResponse = { budgets: [{ id: 1 }] };
      v1.get.mockResolvedValue(mockResponse);

      const result = await api.budgets.list();

      expect(v1.get).toHaveBeenCalledWith("/budgets");
      expect(v2.get).not.toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });

    it("create routes to v1", async () => {
      const mockResponse = { budget: { id: 1 } };
      v1.post.mockResolvedValue(mockResponse);

      const result = await api.budgets.create({ amount: 500 });

      expect(v1.post).toHaveBeenCalledWith("/budgets", { amount: 500 });
      expect(v2.post).not.toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });

    it("update routes to v2", async () => {
      const mockResponse = { budget: { id: 1 } };
      v2.put.mockResolvedValue(mockResponse);

      const result = await api.budgets.update(1, { amount: 600 });

      expect(v2.put).toHaveBeenCalledWith("/budgets/1", { amount: 600 });
      expect(v1.put).not.toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });

    it("delete routes to v1", async () => {
      v1.delete.mockResolvedValue(undefined);

      await api.budgets.delete(1);

      expect(v1.delete).toHaveBeenCalledWith("/budgets/1");
      expect(v2.delete).not.toHaveBeenCalled();
    });
  });

  // --- Assets ---
  describe("assets", () => {
    const v2ManualAccount = {
      id: 1, type: "cash", name: "Wallet", balance: "100.00",
      balance_as_of: "2024-01-20", currency: "usd",
      institution_name: "Personal", created_at: "2024-01-01",
      updated_at: "2024-01-01",
    };

    it("list maps v2 manual_accounts to assets", async () => {
      v2.get.mockResolvedValue({ manual_accounts: [v2ManualAccount] });

      const result = await api.assets.list();

      expect(v2.get).toHaveBeenCalledWith("/manual_accounts");
      expect(result.assets).toHaveLength(1);
      expect(result.assets[0].type_name).toBe("cash");
    });

    it("create maps request and response via v2", async () => {
      v2.post.mockResolvedValue(v2ManualAccount);

      const result = await api.assets.create({ type_name: "cash", name: "Wallet" });

      expect(v2.post).toHaveBeenCalledWith("/manual_accounts", expect.objectContaining({ type: "cash" }));
      expect(result.asset.name).toBe("Wallet");
    });

    it("update maps request and response via v2", async () => {
      v2.put.mockResolvedValue(v2ManualAccount);

      const result = await api.assets.update(1, { name: "New Wallet" });

      expect(v2.put).toHaveBeenCalledWith("/manual_accounts/1", expect.objectContaining({ name: "New Wallet" }));
      expect(result.asset.name).toBe("Wallet");
    });

    it("delete routes to v2", async () => {
      v2.delete.mockResolvedValue(undefined);

      await api.assets.delete(1);

      expect(v2.delete).toHaveBeenCalledWith("/manual_accounts/1");
    });
  });

  // --- Plaid ---
  describe("plaid", () => {
    const v2PlaidAccount = {
      id: 1, plaid_item_id: "12345", date_linked: "2024-01-15",
      linked_by_name: "John", name: "Checking", display_name: "My Checking",
      type: "depository", subtype: "checking", mask: "1234",
      institution_name: "Chase", status: "active",
      allow_transaction_modifications: true, limit: null,
      balance: "1500.00", currency: "usd", to_base: 1,
      balance_last_update: "2024-01-20", import_start_date: "2024-01-01",
      last_import: "2024-01-20", last_fetch: "2024-01-20",
      plaid_last_successful_update: "2024-01-20",
    };

    it("list maps v2 plaid accounts to MCP format", async () => {
      v2.get.mockResolvedValue({ plaid_accounts: [v2PlaidAccount] });

      const result = await api.plaid.list();

      expect(v2.get).toHaveBeenCalledWith("/plaid_accounts");
      expect(result.plaid_accounts).toHaveLength(1);
      expect(result.plaid_accounts[0].plaid_item_id).toBe(12345);
      expect(result.plaid_accounts[0].name).toBe("Checking");
    });

    it("fetch posts to v2 and returns true", async () => {
      v2.post.mockResolvedValue({});

      const result = await api.plaid.fetch();

      expect(v2.post).toHaveBeenCalledWith("/plaid_accounts/fetch");
      expect(result).toBe(true);
    });
  });

  // --- Error propagation ---
  describe("error propagation", () => {
    it("propagates LunchMoneyAPIError from v2 client", async () => {
      const error = new LunchMoneyAPIError("Not found", 404);
      v2.get.mockRejectedValue(error);

      await expect(api.user.get()).rejects.toThrow(error);
    });
  });
});
