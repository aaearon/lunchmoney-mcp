import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerBudgetTools } from "../../src/tools/budgets.js";
import { LunchMoneyAPIError } from "../../src/utils/errors.js";
import type { BudgetsResponse, Budget } from "../../src/types/index.js";

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

describe("Budget tools", () => {
  let mockServer: ReturnType<typeof createMockServer>;
  let mockApi: ReturnType<typeof createMockApi>;
  let tools: RegisteredTool[];

  beforeEach(() => {
    mockServer = createMockServer();
    mockApi = createMockApi();
    registerBudgetTools(mockServer as never, mockApi as never);
    tools = mockServer.tools;
  });

  it("registers four tools", () => {
    expect(tools).toHaveLength(4);
    expect(tools.map((t) => t.name)).toEqual([
      "getBudgets",
      "createBudget",
      "updateBudget",
      "deleteBudget",
    ]);
  });

  describe("getBudgets", () => {
    it("returns JSON stringified budgets on success", async () => {
      const mockResponse: BudgetsResponse = {
        budgets: [
          {
            id: 1,
            category_id: 10,
            category_name: "Groceries",
            amount: "500.00",
            currency: "usd",
            start_date: "2024-01-01",
            end_date: "2024-01-31",
          },
          {
            id: 2,
            category_id: 20,
            category_name: "Entertainment",
            amount: "200.00",
            currency: "usd",
            start_date: "2024-01-01",
            end_date: "2024-01-31",
          },
        ],
      };

      mockApi.budgets.list.mockResolvedValue(mockResponse);

      const tool = tools.find((t) => t.name === "getBudgets")!;
      const result = await tool.execute({});

      expect(mockApi.budgets.list).toHaveBeenCalled();
      expect(result).toBe(JSON.stringify(mockResponse, null, 2));
    });

    it("returns formatted error on LunchMoneyAPIError", async () => {
      mockApi.budgets.list.mockRejectedValue(
        new LunchMoneyAPIError("Unauthorized", 401)
      );

      const tool = tools.find((t) => t.name === "getBudgets")!;
      const result = await tool.execute({});

      expect(result).toBe(
        "Lunch Money API Error: Unauthorized (Status: 401)"
      );
    });

    it("returns formatted error on generic Error", async () => {
      mockApi.budgets.list.mockRejectedValue(new Error("Network failure"));

      const tool = tools.find((t) => t.name === "getBudgets")!;
      const result = await tool.execute({});

      expect(result).toBe("Error: Network failure");
    });

    it("returns unknown error message for non-Error throws", async () => {
      mockApi.budgets.list.mockRejectedValue("something unexpected");

      const tool = tools.find((t) => t.name === "getBudgets")!;
      const result = await tool.execute({});

      expect(result).toBe("An unknown error occurred");
    });
  });

  describe("createBudget", () => {
    it("returns JSON stringified budget on success", async () => {
      const mockResponse: { budget: Budget } = {
        budget: {
          id: 3,
          category_id: 30,
          category_name: "Transport",
          amount: "150.00",
          currency: "usd",
          start_date: "2024-02-01",
          end_date: "2024-02-29",
        },
      };

      mockApi.budgets.create.mockResolvedValue(mockResponse);

      const tool = tools.find((t) => t.name === "createBudget")!;
      const args = {
        category_id: 30,
        amount: "150.00",
        start_date: "2024-02-01",
        end_date: "2024-02-29",
      };
      const result = await tool.execute(args);

      expect(mockApi.budgets.create).toHaveBeenCalledWith(args);
      expect(result).toBe(JSON.stringify(mockResponse, null, 2));
    });

    it("returns formatted error on LunchMoneyAPIError", async () => {
      mockApi.budgets.create.mockRejectedValue(
        new LunchMoneyAPIError("Bad Request", 400)
      );

      const tool = tools.find((t) => t.name === "createBudget")!;
      const result = await tool.execute({
        amount: "150.00",
        start_date: "2024-02-01",
        end_date: "2024-02-29",
      });

      expect(result).toBe(
        "Lunch Money API Error: Bad Request (Status: 400)"
      );
    });

    it("returns formatted error on generic Error", async () => {
      mockApi.budgets.create.mockRejectedValue(new Error("Connection timeout"));

      const tool = tools.find((t) => t.name === "createBudget")!;
      const result = await tool.execute({
        amount: "150.00",
        start_date: "2024-02-01",
        end_date: "2024-02-29",
      });

      expect(result).toBe("Error: Connection timeout");
    });

    it("returns unknown error message for non-Error throws", async () => {
      mockApi.budgets.create.mockRejectedValue(42);

      const tool = tools.find((t) => t.name === "createBudget")!;
      const result = await tool.execute({
        amount: "150.00",
        start_date: "2024-02-01",
        end_date: "2024-02-29",
      });

      expect(result).toBe("An unknown error occurred");
    });
  });

  describe("updateBudget", () => {
    it("returns JSON stringified updated budget on success", async () => {
      const mockResponse: { budget: Budget } = {
        budget: {
          id: 1,
          category_id: 10,
          category_name: "Groceries",
          amount: "600.00",
          currency: "usd",
          start_date: "2024-01-01",
          end_date: "2024-01-31",
        },
      };

      mockApi.budgets.update.mockResolvedValue(mockResponse);

      const tool = tools.find((t) => t.name === "updateBudget")!;
      const result = await tool.execute({ id: 1, amount: "600.00" });

      expect(mockApi.budgets.update).toHaveBeenCalledWith(1, {
        amount: "600.00",
      });
      expect(result).toBe(JSON.stringify(mockResponse, null, 2));
    });

    it("returns formatted error on LunchMoneyAPIError", async () => {
      mockApi.budgets.update.mockRejectedValue(
        new LunchMoneyAPIError("Not Found", 404)
      );

      const tool = tools.find((t) => t.name === "updateBudget")!;
      const result = await tool.execute({ id: 999, amount: "600.00" });

      expect(result).toBe(
        "Lunch Money API Error: Not Found (Status: 404)"
      );
    });

    it("returns formatted error on generic Error", async () => {
      mockApi.budgets.update.mockRejectedValue(new Error("Server error"));

      const tool = tools.find((t) => t.name === "updateBudget")!;
      const result = await tool.execute({ id: 1, amount: "600.00" });

      expect(result).toBe("Error: Server error");
    });

    it("returns unknown error message for non-Error throws", async () => {
      mockApi.budgets.update.mockRejectedValue(undefined);

      const tool = tools.find((t) => t.name === "updateBudget")!;
      const result = await tool.execute({ id: 1, amount: "600.00" });

      expect(result).toBe("An unknown error occurred");
    });
  });

  describe("deleteBudget", () => {
    it("returns success message on delete", async () => {
      mockApi.budgets.delete.mockResolvedValue(undefined);

      const tool = tools.find((t) => t.name === "deleteBudget")!;
      const result = await tool.execute({ id: 2 });

      expect(mockApi.budgets.delete).toHaveBeenCalledWith(2);
      expect(result).toBe("Budget 2 deleted successfully");
    });

    it("returns formatted error on LunchMoneyAPIError", async () => {
      mockApi.budgets.delete.mockRejectedValue(
        new LunchMoneyAPIError("Forbidden", 403)
      );

      const tool = tools.find((t) => t.name === "deleteBudget")!;
      const result = await tool.execute({ id: 2 });

      expect(result).toBe(
        "Lunch Money API Error: Forbidden (Status: 403)"
      );
    });

    it("returns formatted error on generic Error", async () => {
      mockApi.budgets.delete.mockRejectedValue(new Error("Network issue"));

      const tool = tools.find((t) => t.name === "deleteBudget")!;
      const result = await tool.execute({ id: 2 });

      expect(result).toBe("Error: Network issue");
    });

    it("returns unknown error message for non-Error throws", async () => {
      mockApi.budgets.delete.mockRejectedValue(null);

      const tool = tools.find((t) => t.name === "deleteBudget")!;
      const result = await tool.execute({ id: 2 });

      expect(result).toBe("An unknown error occurred");
    });
  });
});
