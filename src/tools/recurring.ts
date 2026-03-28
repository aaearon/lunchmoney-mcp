import { FastMCP } from "fastmcp";
import { z } from "zod";
import type { LunchMoneyApi } from "../api/facade.js";
import { formatErrorForMCP } from "../utils/errors.js";
import {
  createRecurringItemSchema,
  updateRecurringItemSchema,
  idSchema,
} from "../schemas/index.js";

export function registerRecurringTools(server: FastMCP, api: LunchMoneyApi) {
  server.addTool({
    name: "getRecurringItems",
    description: "List all recurring expense and income items",
    parameters: z.object({}),
    execute: async () => {
      try {
        const response = await api.recurring.list();
        return JSON.stringify(response, null, 2);
      } catch (error) {
        return formatErrorForMCP(error);
      }
    },
  });

  server.addTool({
    name: "createRecurringItem",
    description: "Create a new recurring expense or income item",
    parameters: createRecurringItemSchema,
    execute: async (args: z.infer<typeof createRecurringItemSchema>) => {
      try {
        const item = await api.recurring.create(args);
        return JSON.stringify(item, null, 2);
      } catch (error) {
        return formatErrorForMCP(error);
      }
    },
  });

  server.addTool({
    name: "updateRecurringItem",
    description: "Update an existing recurring item's properties",
    parameters: idSchema.merge(updateRecurringItemSchema),
    execute: async (args: z.infer<typeof idSchema> & z.infer<typeof updateRecurringItemSchema>) => {
      try {
        const { id, ...updateData } = args;
        const item = await api.recurring.update(id, updateData);
        return JSON.stringify(item, null, 2);
      } catch (error) {
        return formatErrorForMCP(error);
      }
    },
  });

  server.addTool({
    name: "deleteRecurringItem",
    description: "Delete a recurring item by ID",
    parameters: idSchema,
    execute: async (args: z.infer<typeof idSchema>) => {
      try {
        await api.recurring.delete(args.id);
        return `Recurring item ${args.id} deleted successfully`;
      } catch (error) {
        return formatErrorForMCP(error);
      }
    },
  });
}
