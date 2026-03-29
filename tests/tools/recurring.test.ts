import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerRecurringTools } from "../../src/tools/recurring.js";
import { LunchMoneyAPIError } from "../../src/utils/errors.js";
import type {
  RecurringItemsResponse,
  RecurringItem,
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

describe("Recurring tools", () => {
  let mockServer: ReturnType<typeof createMockServer>;
  let mockApi: ReturnType<typeof createMockApi>;
  let tools: RegisteredTool[];

  beforeEach(() => {
    mockServer = createMockServer();
    mockApi = createMockApi();
    registerRecurringTools(mockServer as never, mockApi as never);
    tools = mockServer.tools;
  });

  it("registers four tools", () => {
    expect(tools).toHaveLength(4);
    expect(tools.map((t) => t.name)).toEqual([
      "getRecurringItems",
      "createRecurringItem",
      "updateRecurringItem",
      "deleteRecurringItem",
    ]);
  });

  describe("getRecurringItems", () => {
    it("returns JSON stringified recurring items on success", async () => {
      const mockResponse: RecurringItemsResponse = {
        recurring_items: [
          {
            id: 1,
            payee: "Netflix",
            amount: "15.99",
            currency: "usd",
            frequency: "monthly",
            flow: "outflow",
            start_date: "2024-01-01",
          },
          {
            id: 2,
            payee: "Salary",
            amount: "5000.00",
            currency: "usd",
            frequency: "monthly",
            flow: "inflow",
            start_date: "2024-01-15",
          },
        ],
      };

      mockApi.recurring.list.mockResolvedValue(mockResponse);

      const tool = tools.find((t) => t.name === "getRecurringItems")!;
      const result = await tool.execute({});

      expect(mockApi.recurring.list).toHaveBeenCalled();
      expect(result).toBe(JSON.stringify(mockResponse, null, 2));
    });

    it("returns formatted error on LunchMoneyAPIError", async () => {
      mockApi.recurring.list.mockRejectedValue(
        new LunchMoneyAPIError("Unauthorized", 401)
      );

      const tool = tools.find((t) => t.name === "getRecurringItems")!;
      const result = await tool.execute({});

      expect(result).toBe(
        "Lunch Money API Error: Unauthorized (Status: 401)"
      );
    });

    it("returns formatted error on generic Error", async () => {
      mockApi.recurring.list.mockRejectedValue(new Error("Network failure"));

      const tool = tools.find((t) => t.name === "getRecurringItems")!;
      const result = await tool.execute({});

      expect(result).toBe("Error: Network failure");
    });

    it("returns unknown error message for non-Error throws", async () => {
      mockApi.recurring.list.mockRejectedValue("something unexpected");

      const tool = tools.find((t) => t.name === "getRecurringItems")!;
      const result = await tool.execute({});

      expect(result).toBe("An unknown error occurred");
    });
  });

  describe("createRecurringItem", () => {
    it("returns JSON stringified recurring item on success", async () => {
      const mockResponse: { recurring_expense: RecurringItem } = {
        recurring_expense: {
          id: 3,
          payee: "Gym",
          amount: "50.00",
          currency: "usd",
          frequency: "monthly",
          flow: "outflow",
          start_date: "2024-03-01",
        },
      };

      mockApi.recurring.create.mockResolvedValue(mockResponse);

      const tool = tools.find((t) => t.name === "createRecurringItem")!;
      const args = { payee: "Gym", amount: "50.00", frequency: "monthly", flow: "outflow", start_date: "2024-03-01" };
      const result = await tool.execute(args);

      expect(mockApi.recurring.create).toHaveBeenCalledWith(args);
      expect(result).toBe(JSON.stringify(mockResponse, null, 2));
    });

    it("returns formatted error on LunchMoneyAPIError", async () => {
      mockApi.recurring.create.mockRejectedValue(
        new LunchMoneyAPIError("Bad Request", 400)
      );

      const tool = tools.find((t) => t.name === "createRecurringItem")!;
      const result = await tool.execute({ amount: "50.00" });

      expect(result).toBe(
        "Lunch Money API Error: Bad Request (Status: 400)"
      );
    });

    it("returns formatted error on generic Error", async () => {
      mockApi.recurring.create.mockRejectedValue(new Error("Connection timeout"));

      const tool = tools.find((t) => t.name === "createRecurringItem")!;
      const result = await tool.execute({ amount: "50.00" });

      expect(result).toBe("Error: Connection timeout");
    });

    it("returns unknown error message for non-Error throws", async () => {
      mockApi.recurring.create.mockRejectedValue(42);

      const tool = tools.find((t) => t.name === "createRecurringItem")!;
      const result = await tool.execute({ amount: "50.00" });

      expect(result).toBe("An unknown error occurred");
    });
  });

  describe("updateRecurringItem", () => {
    it("returns JSON stringified updated recurring item on success", async () => {
      const mockResponse: { recurring_expense: RecurringItem } = {
        recurring_expense: {
          id: 1,
          payee: "Netflix Premium",
          amount: "22.99",
          currency: "usd",
          frequency: "monthly",
          flow: "outflow",
        },
      };

      mockApi.recurring.update.mockResolvedValue(mockResponse);

      const tool = tools.find((t) => t.name === "updateRecurringItem")!;
      const result = await tool.execute({ id: 1, payee: "Netflix Premium", amount: "22.99" });

      expect(mockApi.recurring.update).toHaveBeenCalledWith(1, {
        payee: "Netflix Premium",
        amount: "22.99",
      });
      expect(result).toBe(JSON.stringify(mockResponse, null, 2));
    });

    it("returns formatted error on LunchMoneyAPIError", async () => {
      mockApi.recurring.update.mockRejectedValue(
        new LunchMoneyAPIError("Not Found", 404)
      );

      const tool = tools.find((t) => t.name === "updateRecurringItem")!;
      const result = await tool.execute({ id: 999, amount: "22.99" });

      expect(result).toBe(
        "Lunch Money API Error: Not Found (Status: 404)"
      );
    });

    it("returns formatted error on generic Error", async () => {
      mockApi.recurring.update.mockRejectedValue(new Error("Server error"));

      const tool = tools.find((t) => t.name === "updateRecurringItem")!;
      const result = await tool.execute({ id: 1, amount: "22.99" });

      expect(result).toBe("Error: Server error");
    });

    it("returns unknown error message for non-Error throws", async () => {
      mockApi.recurring.update.mockRejectedValue(undefined);

      const tool = tools.find((t) => t.name === "updateRecurringItem")!;
      const result = await tool.execute({ id: 1, amount: "22.99" });

      expect(result).toBe("An unknown error occurred");
    });
  });

  describe("deleteRecurringItem", () => {
    it("returns success message on delete", async () => {
      mockApi.recurring.delete.mockResolvedValue(undefined);

      const tool = tools.find((t) => t.name === "deleteRecurringItem")!;
      const result = await tool.execute({ id: 3 });

      expect(mockApi.recurring.delete).toHaveBeenCalledWith(3);
      expect(result).toBe("Recurring item 3 deleted successfully");
    });

    it("returns formatted error on LunchMoneyAPIError", async () => {
      mockApi.recurring.delete.mockRejectedValue(
        new LunchMoneyAPIError("Forbidden", 403)
      );

      const tool = tools.find((t) => t.name === "deleteRecurringItem")!;
      const result = await tool.execute({ id: 3 });

      expect(result).toBe(
        "Lunch Money API Error: Forbidden (Status: 403)"
      );
    });

    it("returns formatted error on generic Error", async () => {
      mockApi.recurring.delete.mockRejectedValue(new Error("Network issue"));

      const tool = tools.find((t) => t.name === "deleteRecurringItem")!;
      const result = await tool.execute({ id: 3 });

      expect(result).toBe("Error: Network issue");
    });

    it("returns unknown error message for non-Error throws", async () => {
      mockApi.recurring.delete.mockRejectedValue(null);

      const tool = tools.find((t) => t.name === "deleteRecurringItem")!;
      const result = await tool.execute({ id: 3 });

      expect(result).toBe("An unknown error occurred");
    });
  });
});
