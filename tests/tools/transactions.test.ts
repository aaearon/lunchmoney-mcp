import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerTransactionTools } from "../../src/tools/transactions.js";
import { LunchMoneyAPIError } from "../../src/utils/errors.js";
import type {
  TransactionsResponse,
  Transaction,
} from "../../src/types/index.js";

// Capture registered tools via a fake FastMCP server
interface RegisteredTool {
  name: string;
  description: string;
  execute: (args: Record<string, unknown>) => Promise<string>;
}

function createMockServer() {
  const tools: RegisteredTool[] = [];
  return {
    addTool: (tool: RegisteredTool) => {
      tools.push(tool);
    },
    tools,
  };
}

function createMockApi() {
  return {
    user: { get: vi.fn() },
    categories: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), createGroup: vi.fn(), addToGroup: vi.fn() },
    tags: { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    transactions: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), bulkUpdate: vi.fn(), getGroup: vi.fn(), createGroup: vi.fn(), deleteGroup: vi.fn(), unsplit: vi.fn() },
    recurring: { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    budgets: { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    assets: { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    plaid: { list: vi.fn(), fetch: vi.fn() },
  };
}

const sampleTransaction: Transaction = {
  id: 1,
  date: "2024-06-01",
  payee: "Starbucks",
  amount: "5.50",
  currency: "usd",
  notes: "Morning coffee",
  category_id: 10,
  account_id: 100,
  status: "cleared",
  type: "expense",
};

describe("Transaction tools", () => {
  let mockServer: ReturnType<typeof createMockServer>;
  let mockApi: ReturnType<typeof createMockApi>;
  let tools: RegisteredTool[];

  beforeEach(() => {
    mockServer = createMockServer();
    mockApi = createMockApi();
    registerTransactionTools(mockServer as never, mockApi as never);
    tools = mockServer.tools;
  });

  it("registers ten tools", () => {
    expect(tools).toHaveLength(10);
    expect(tools.map((t) => t.name)).toEqual([
      "getTransactions",
      "getTransaction",
      "createTransaction",
      "updateTransaction",
      "deleteTransaction",
      "bulkUpdateTransactions",
      "getTransactionGroup",
      "createTransactionGroup",
      "deleteTransactionGroup",
      "unsplitTransactions",
    ]);
  });

  // ---------- getTransactions ----------
  describe("getTransactions", () => {
    it("returns JSON stringified transactions on success", async () => {
      const mockResponse: TransactionsResponse = {
        transactions: [sampleTransaction],
      };

      mockApi.transactions.list.mockResolvedValue(mockResponse);

      const tool = tools.find((t) => t.name === "getTransactions")!;
      const result = await tool.execute({});

      expect(mockApi.transactions.list).toHaveBeenCalledWith({});
      expect(result).toBe(JSON.stringify(mockResponse, null, 2));
    });

    it("returns formatted error on LunchMoneyAPIError", async () => {
      mockApi.transactions.list.mockRejectedValue(
        new LunchMoneyAPIError("Unauthorized", 401)
      );

      const tool = tools.find((t) => t.name === "getTransactions")!;
      const result = await tool.execute({});

      expect(result).toBe(
        "Lunch Money API Error: Unauthorized (Status: 401)"
      );
    });
  });

  // ---------- getTransaction ----------
  describe("getTransaction", () => {
    it("returns JSON stringified single transaction on success", async () => {
      mockApi.transactions.get.mockResolvedValue(sampleTransaction);

      const tool = tools.find((t) => t.name === "getTransaction")!;
      const result = await tool.execute({ id: 1 });

      expect(mockApi.transactions.get).toHaveBeenCalledWith(1);
      expect(result).toBe(JSON.stringify(sampleTransaction, null, 2));
    });

    it("returns formatted error on LunchMoneyAPIError", async () => {
      mockApi.transactions.get.mockRejectedValue(
        new LunchMoneyAPIError("Transaction not found", 404)
      );

      const tool = tools.find((t) => t.name === "getTransaction")!;
      const result = await tool.execute({ id: 99999 });

      expect(result).toBe(
        "Lunch Money API Error: Transaction not found (Status: 404)"
      );
    });
  });

  // ---------- createTransaction ----------
  describe("createTransaction", () => {
    it("returns JSON stringified created transaction on success", async () => {
      const mockResponse = { transaction: sampleTransaction };
      mockApi.transactions.create.mockResolvedValue(mockResponse);

      const tool = tools.find((t) => t.name === "createTransaction")!;
      const args = {
        date: "2024-06-01",
        amount: "5.50",
        payee: "Starbucks",
        account_id: 100,
      };
      const result = await tool.execute(args);

      expect(mockApi.transactions.create).toHaveBeenCalledWith(args);
      expect(result).toBe(JSON.stringify(mockResponse, null, 2));
    });

    it("returns formatted error on LunchMoneyAPIError", async () => {
      mockApi.transactions.create.mockRejectedValue(
        new LunchMoneyAPIError("Validation error", 422)
      );

      const tool = tools.find((t) => t.name === "createTransaction")!;
      const result = await tool.execute({
        date: "2024-06-01",
        amount: "5.50",
        account_id: 100,
      });

      expect(result).toBe(
        "Lunch Money API Error: Validation error (Status: 422)"
      );
    });
  });

  // ---------- updateTransaction ----------
  describe("updateTransaction", () => {
    it("returns JSON stringified updated transaction on success", async () => {
      const updatedTransaction = { ...sampleTransaction, payee: "Updated" };
      const mockResponse = { transaction: updatedTransaction };
      mockApi.transactions.update.mockResolvedValue(mockResponse);

      const tool = tools.find((t) => t.name === "updateTransaction")!;
      const result = await tool.execute({ id: 1, payee: "Updated" });

      expect(mockApi.transactions.update).toHaveBeenCalledWith(1, {
        payee: "Updated",
      });
      expect(result).toBe(JSON.stringify(mockResponse, null, 2));
    });

    it("returns formatted error on LunchMoneyAPIError", async () => {
      mockApi.transactions.update.mockRejectedValue(
        new LunchMoneyAPIError("Not found", 404)
      );

      const tool = tools.find((t) => t.name === "updateTransaction")!;
      const result = await tool.execute({ id: 99999, payee: "Updated" });

      expect(result).toBe(
        "Lunch Money API Error: Not found (Status: 404)"
      );
    });
  });

  // ---------- deleteTransaction ----------
  describe("deleteTransaction", () => {
    it("returns success message on delete", async () => {
      mockApi.transactions.delete.mockResolvedValue(undefined);

      const tool = tools.find((t) => t.name === "deleteTransaction")!;
      const result = await tool.execute({ id: 1 });

      expect(mockApi.transactions.delete).toHaveBeenCalledWith(1);
      expect(result).toBe("Transaction 1 deleted successfully");
    });

    it("returns formatted error on LunchMoneyAPIError", async () => {
      mockApi.transactions.delete.mockRejectedValue(
        new LunchMoneyAPIError("Not found", 404)
      );

      const tool = tools.find((t) => t.name === "deleteTransaction")!;
      const result = await tool.execute({ id: 99999 });

      expect(result).toBe(
        "Lunch Money API Error: Not found (Status: 404)"
      );
    });
  });

  // ---------- bulkUpdateTransactions ----------
  describe("bulkUpdateTransactions", () => {
    it("returns JSON stringified update count on success", async () => {
      const mockResponse = { updated: 3 };
      mockApi.transactions.bulkUpdate.mockResolvedValue(mockResponse);

      const tool = tools.find((t) => t.name === "bulkUpdateTransactions")!;
      const args = {
        transaction_ids: [1, 2, 3],
        status: "cleared",
      };
      const result = await tool.execute(args);

      expect(mockApi.transactions.bulkUpdate).toHaveBeenCalledWith(args);
      expect(result).toBe(JSON.stringify(mockResponse, null, 2));
    });

    it("returns formatted error on LunchMoneyAPIError", async () => {
      mockApi.transactions.bulkUpdate.mockRejectedValue(
        new LunchMoneyAPIError("Server error", 500)
      );

      const tool = tools.find((t) => t.name === "bulkUpdateTransactions")!;
      const result = await tool.execute({
        transaction_ids: [1, 2, 3],
        status: "cleared",
      });

      expect(result).toBe(
        "Lunch Money API Error: Server error (Status: 500)"
      );
    });
  });

  // ---------- getTransactionGroup ----------
  describe("getTransactionGroup", () => {
    it("returns JSON stringified transaction group on success", async () => {
      const groupTransaction: Transaction = {
        ...sampleTransaction,
        is_group: true,
        subtransactions: [
          { ...sampleTransaction, id: 2, group_id: 1 },
          { ...sampleTransaction, id: 3, group_id: 1 },
        ],
      };
      mockApi.transactions.getGroup.mockResolvedValue(groupTransaction);

      const tool = tools.find((t) => t.name === "getTransactionGroup")!;
      const result = await tool.execute({ id: 1 });

      expect(mockApi.transactions.getGroup).toHaveBeenCalledWith(1);
      expect(result).toBe(JSON.stringify(groupTransaction, null, 2));
    });

    it("returns formatted error on LunchMoneyAPIError", async () => {
      mockApi.transactions.getGroup.mockRejectedValue(
        new LunchMoneyAPIError("Group not found", 404)
      );

      const tool = tools.find((t) => t.name === "getTransactionGroup")!;
      const result = await tool.execute({ id: 99999 });

      expect(result).toBe(
        "Lunch Money API Error: Group not found (Status: 404)"
      );
    });

    it("returns formatted error on generic Error", async () => {
      mockApi.transactions.getGroup.mockRejectedValue(new Error("Network failure"));

      const tool = tools.find((t) => t.name === "getTransactionGroup")!;
      const result = await tool.execute({ id: 1 });

      expect(result).toBe("Error: Network failure");
    });

    it("returns unknown error message for non-Error throws", async () => {
      mockApi.transactions.getGroup.mockRejectedValue("something unexpected");

      const tool = tools.find((t) => t.name === "getTransactionGroup")!;
      const result = await tool.execute({ id: 1 });

      expect(result).toBe("An unknown error occurred");
    });
  });

  // ---------- createTransactionGroup ----------
  describe("createTransactionGroup", () => {
    it("returns JSON stringified group transaction on success", async () => {
      const groupTransaction: Transaction = {
        ...sampleTransaction,
        is_group: true,
        subtransactions: [
          { ...sampleTransaction, id: 2, group_id: 1 },
          { ...sampleTransaction, id: 3, group_id: 1 },
        ],
      };
      mockApi.transactions.createGroup.mockResolvedValue(groupTransaction);

      const tool = tools.find((t) => t.name === "createTransactionGroup")!;
      const args = {
        date: "2024-06-01",
        payee: "Grouped Transaction",
        transactions: [2, 3],
        category_id: 10,
        notes: "Grouped for tracking",
      };
      const result = await tool.execute(args);

      expect(mockApi.transactions.createGroup).toHaveBeenCalledWith(args);
      expect(result).toBe(JSON.stringify(groupTransaction, null, 2));
    });

    it("returns formatted error on LunchMoneyAPIError", async () => {
      mockApi.transactions.createGroup.mockRejectedValue(
        new LunchMoneyAPIError("Validation error", 422)
      );

      const tool = tools.find((t) => t.name === "createTransactionGroup")!;
      const result = await tool.execute({
        date: "2024-06-01",
        payee: "Bad Group",
        transactions: [2, 3],
      });

      expect(result).toBe(
        "Lunch Money API Error: Validation error (Status: 422)"
      );
    });

    it("returns formatted error on generic Error", async () => {
      mockApi.transactions.createGroup.mockRejectedValue(new Error("Connection timeout"));

      const tool = tools.find((t) => t.name === "createTransactionGroup")!;
      const result = await tool.execute({
        date: "2024-06-01",
        payee: "Group",
        transactions: [2, 3],
      });

      expect(result).toBe("Error: Connection timeout");
    });

    it("returns unknown error message for non-Error throws", async () => {
      mockApi.transactions.createGroup.mockRejectedValue(42);

      const tool = tools.find((t) => t.name === "createTransactionGroup")!;
      const result = await tool.execute({
        date: "2024-06-01",
        payee: "Group",
        transactions: [2, 3],
      });

      expect(result).toBe("An unknown error occurred");
    });
  });

  // ---------- deleteTransactionGroup ----------
  describe("deleteTransactionGroup", () => {
    it("returns success message on delete", async () => {
      mockApi.transactions.deleteGroup.mockResolvedValue(undefined);

      const tool = tools.find((t) => t.name === "deleteTransactionGroup")!;
      const result = await tool.execute({ id: 1 });

      expect(mockApi.transactions.deleteGroup).toHaveBeenCalledWith(1);
      expect(result).toBe("Transaction group 1 deleted successfully");
    });

    it("returns formatted error on LunchMoneyAPIError", async () => {
      mockApi.transactions.deleteGroup.mockRejectedValue(
        new LunchMoneyAPIError("Group not found", 404)
      );

      const tool = tools.find((t) => t.name === "deleteTransactionGroup")!;
      const result = await tool.execute({ id: 99999 });

      expect(result).toBe(
        "Lunch Money API Error: Group not found (Status: 404)"
      );
    });

    it("returns formatted error on generic Error", async () => {
      mockApi.transactions.deleteGroup.mockRejectedValue(new Error("Network failure"));

      const tool = tools.find((t) => t.name === "deleteTransactionGroup")!;
      const result = await tool.execute({ id: 1 });

      expect(result).toBe("Error: Network failure");
    });

    it("returns unknown error message for non-Error throws", async () => {
      mockApi.transactions.deleteGroup.mockRejectedValue("something unexpected");

      const tool = tools.find((t) => t.name === "deleteTransactionGroup")!;
      const result = await tool.execute({ id: 1 });

      expect(result).toBe("An unknown error occurred");
    });
  });

  // ---------- unsplitTransactions ----------
  describe("unsplitTransactions", () => {
    it("returns JSON stringified response on success", async () => {
      const mockResponse = { parent_ids: [1], transactions: [sampleTransaction] };
      mockApi.transactions.unsplit.mockResolvedValue(mockResponse);

      const tool = tools.find((t) => t.name === "unsplitTransactions")!;
      const args = { parent_ids: [1] };
      const result = await tool.execute(args);

      expect(mockApi.transactions.unsplit).toHaveBeenCalledWith(args);
      expect(result).toBe(JSON.stringify(mockResponse, null, 2));
    });

    it("returns formatted error on LunchMoneyAPIError", async () => {
      mockApi.transactions.unsplit.mockRejectedValue(
        new LunchMoneyAPIError("Cannot unsplit", 400)
      );

      const tool = tools.find((t) => t.name === "unsplitTransactions")!;
      const result = await tool.execute({ parent_ids: [99999] });

      expect(result).toBe(
        "Lunch Money API Error: Cannot unsplit (Status: 400)"
      );
    });

    it("returns formatted error on generic Error", async () => {
      mockApi.transactions.unsplit.mockRejectedValue(new Error("Connection timeout"));

      const tool = tools.find((t) => t.name === "unsplitTransactions")!;
      const result = await tool.execute({ parent_ids: [1] });

      expect(result).toBe("Error: Connection timeout");
    });

    it("returns unknown error message for non-Error throws", async () => {
      mockApi.transactions.unsplit.mockRejectedValue(42);

      const tool = tools.find((t) => t.name === "unsplitTransactions")!;
      const result = await tool.execute({ parent_ids: [1] });

      expect(result).toBe("An unknown error occurred");
    });
  });
});
