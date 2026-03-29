import { FastMCP } from "fastmcp";
import { z } from "zod";
import type { LunchMoneyApi } from "../api/facade.js";
import { formatErrorForMCP } from "../utils/errors.js";
import {
  createTagSchema,
  updateTagSchema,
  idSchema,
} from "../schemas/index.js";

export function registerTagTools(server: FastMCP, api: LunchMoneyApi) {
  server.addTool({
    name: "getTags",
    description: "List all transaction tags",
    parameters: z.object({}),
    execute: async () => {
      try {
        const response = await api.tags.list();
        return JSON.stringify(response, null, 2);
      } catch (error) {
        return formatErrorForMCP(error);
      }
    },
  });

  server.addTool({
    name: "createTag",
    description: "Create a new tag for categorizing transactions",
    parameters: createTagSchema,
    execute: async (args: z.infer<typeof createTagSchema>) => {
      try {
        const tag = await api.tags.create(args);
        return JSON.stringify(tag, null, 2);
      } catch (error) {
        return formatErrorForMCP(error);
      }
    },
  });

  server.addTool({
    name: "updateTag",
    description: "Update an existing tag's name",
    parameters: idSchema.merge(updateTagSchema),
    execute: async (args: z.infer<typeof idSchema> & z.infer<typeof updateTagSchema>) => {
      try {
        const { id, ...updateData } = args;
        const tag = await api.tags.update(id, updateData);
        return JSON.stringify(tag, null, 2);
      } catch (error) {
        return formatErrorForMCP(error);
      }
    },
  });

  server.addTool({
    name: "deleteTag",
    description: "Delete a tag by ID",
    parameters: idSchema,
    execute: async (args: z.infer<typeof idSchema>) => {
      try {
        await api.tags.delete(args.id);
        return `Tag ${args.id} deleted successfully`;
      } catch (error) {
        return formatErrorForMCP(error);
      }
    },
  });
}
