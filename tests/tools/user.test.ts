import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerUserTools } from "../../src/tools/user.js";
import { LunchMoneyAPIError } from "../../src/utils/errors.js";
import type { User } from "../../src/types/index.js";

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
  };
}

describe("User tools", () => {
  let mockServer: ReturnType<typeof createMockServer>;
  let mockApi: ReturnType<typeof createMockApi>;
  let tools: RegisteredTool[];

  beforeEach(() => {
    mockServer = createMockServer();
    mockApi = createMockApi();
    registerUserTools(mockServer as never, mockApi as never);
    tools = mockServer.tools;
  });

  it("registers one tool", () => {
    expect(tools).toHaveLength(1);
    expect(tools.map((t) => t.name)).toEqual(["getUser"]);
  });

  describe("getUser", () => {
    it("returns JSON stringified user on success", async () => {
      const mockUser: User = {
        id: 1,
        email: "test@example.com",
        name: "Test User",
        currency: "usd",
        budget_display_order: [1, 2, 3],
        date_format: "MM/DD/YYYY",
        first_day_of_week: 0,
        beta_user: false,
        created_at: "2024-01-01T00:00:00.000Z",
      };

      mockApi.user.get.mockResolvedValue(mockUser);

      const tool = tools.find((t) => t.name === "getUser")!;
      const result = await tool.execute({});

      expect(mockApi.user.get).toHaveBeenCalled();
      expect(result).toBe(JSON.stringify(mockUser, null, 2));
    });

    it("returns formatted error on LunchMoneyAPIError", async () => {
      mockApi.user.get.mockRejectedValue(
        new LunchMoneyAPIError("Unauthorized", 401)
      );

      const tool = tools.find((t) => t.name === "getUser")!;
      const result = await tool.execute({});

      expect(result).toBe(
        "Lunch Money API Error: Unauthorized (Status: 401)"
      );
    });

    it("returns formatted error on generic Error", async () => {
      mockApi.user.get.mockRejectedValue(new Error("Network failure"));

      const tool = tools.find((t) => t.name === "getUser")!;
      const result = await tool.execute({});

      expect(result).toBe("Error: Network failure");
    });

    it("returns unknown error message for non-Error throws", async () => {
      mockApi.user.get.mockRejectedValue("something unexpected");

      const tool = tools.find((t) => t.name === "getUser")!;
      const result = await tool.execute({});

      expect(result).toBe("An unknown error occurred");
    });
  });
});
