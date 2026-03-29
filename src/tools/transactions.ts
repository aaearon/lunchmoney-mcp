import { FastMCP } from "fastmcp";
import { z } from "zod";
import type { LunchMoneyApi } from "../api/facade.js";
import { formatErrorForMCP } from "../utils/errors.js";
import {
  transactionFilterSchema,
  createTransactionSchema,
  updateTransactionSchema,
  bulkUpdateTransactionsSchema,
  createTransactionGroupSchema,
  unsplitTransactionsSchema,
  idSchema,
} from "../schemas/index.js";

export function registerTransactionTools(server: FastMCP, api: LunchMoneyApi) {
  server.addTool({
    name: "getTransactions",
    description:
      "List transactions with advanced filtering options including date range, category, tags, account, and status",
    parameters: transactionFilterSchema,
    execute: async (args: z.infer<typeof transactionFilterSchema>) => {
      try {
        const response = await api.transactions.list(args);
        return JSON.stringify(response, null, 2);
      } catch (error) {
        return formatErrorForMCP(error);
      }
    },
  });

  server.addTool({
    name: "getTransaction",
    description: "Get a single transaction by ID",
    parameters: idSchema,
    execute: async (args: z.infer<typeof idSchema>) => {
      try {
        const response = await api.transactions.get(args.id);
        return JSON.stringify(response, null, 2);
      } catch (error) {
        return formatErrorForMCP(error);
      }
    },
  });

  server.addTool({
    name: "createTransaction",
    description: "Create a new transaction (expense, income, or transfer)",
    parameters: createTransactionSchema,
    execute: async (args: z.infer<typeof createTransactionSchema>) => {
      try {
        const transaction = await api.transactions.create(args);
        return JSON.stringify(transaction, null, 2);
      } catch (error) {
        return formatErrorForMCP(error);
      }
    },
  });

  server.addTool({
    name: "updateTransaction",
    description: "Update an existing transaction's properties",
    parameters: idSchema.merge(updateTransactionSchema),
    execute: async (args: z.infer<typeof idSchema> & z.infer<typeof updateTransactionSchema>) => {
      try {
        const { id, ...updateData } = args;
        const transaction = await api.transactions.update(id, updateData);
        return JSON.stringify(transaction, null, 2);
      } catch (error) {
        return formatErrorForMCP(error);
      }
    },
  });

  server.addTool({
    name: "deleteTransaction",
    description: "Delete a transaction by ID",
    parameters: idSchema,
    execute: async (args: z.infer<typeof idSchema>) => {
      try {
        await api.transactions.delete(args.id);
        return `Transaction ${args.id} deleted successfully`;
      } catch (error) {
        return formatErrorForMCP(error);
      }
    },
  });

  server.addTool({
    name: "bulkUpdateTransactions",
    description:
      "Bulk update multiple transactions with the same changes (category, tags, notes, status)",
    parameters: bulkUpdateTransactionsSchema,
    execute: async (args: z.infer<typeof bulkUpdateTransactionsSchema>) => {
      try {
        const result = await api.transactions.bulkUpdate(args);
        return JSON.stringify(result, null, 2);
      } catch (error) {
        return formatErrorForMCP(error);
      }
    },
  });

  server.addTool({
    name: "getTransactionGroup",
    description: "Retrieve a transaction group with all child transactions",
    parameters: idSchema,
    execute: async (args: z.infer<typeof idSchema>) => {
      try {
        const response = await api.transactions.getGroup(args.id);
        return JSON.stringify(response, null, 2);
      } catch (error) {
        return formatErrorForMCP(error);
      }
    },
  });

  server.addTool({
    name: "createTransactionGroup",
    description:
      "Group multiple transaction IDs under a single parent transaction",
    parameters: createTransactionGroupSchema,
    execute: async (args: z.infer<typeof createTransactionGroupSchema>) => {
      try {
        const response = await api.transactions.createGroup(args);
        return JSON.stringify(response, null, 2);
      } catch (error) {
        return formatErrorForMCP(error);
      }
    },
  });

  server.addTool({
    name: "deleteTransactionGroup",
    description:
      "Delete a transaction group, restoring individual transactions",
    parameters: idSchema,
    execute: async (args: z.infer<typeof idSchema>) => {
      try {
        await api.transactions.deleteGroup(args.id);
        return `Transaction group ${args.id} deleted successfully`;
      } catch (error) {
        return formatErrorForMCP(error);
      }
    },
  });

  server.addTool({
    name: "unsplitTransactions",
    description:
      "Reverse a split, merging child transactions back into parent",
    parameters: unsplitTransactionsSchema,
    execute: async (args: z.infer<typeof unsplitTransactionsSchema>) => {
      try {
        const response = await api.transactions.unsplit(args);
        return JSON.stringify(response, null, 2);
      } catch (error) {
        return formatErrorForMCP(error);
      }
    },
  });
}
