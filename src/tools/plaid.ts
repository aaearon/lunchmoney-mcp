import { FastMCP } from "fastmcp";
import { z } from "zod";
import type { LunchMoneyApi } from "../api/facade.js";
import { formatErrorForMCP } from "../utils/errors.js";

export function registerPlaidTools(server: FastMCP, api: LunchMoneyApi) {
  server.addTool({
    name: "getPlaidAccounts",
    description: "List all Plaid-connected accounts with balances",
    parameters: z.object({}),
    execute: async () => {
      try {
        const response = await api.plaid.list();
        return JSON.stringify(response, null, 2);
      } catch (error) {
        return formatErrorForMCP(error);
      }
    },
  });

  server.addTool({
    name: "fetchPlaidAccounts",
    description: "Trigger a Plaid sync to update account balances",
    parameters: z.object({}),
    execute: async () => {
      try {
        const response = await api.plaid.fetch();
        return JSON.stringify(response, null, 2);
      } catch (error) {
        return formatErrorForMCP(error);
      }
    },
  });
}
