import { FastMCP } from "fastmcp";
import { z } from "zod";
import type { LunchMoneyApi } from "../api/facade.js";
import { formatErrorForMCP } from "../utils/errors.js";
import {
  createAssetSchema,
  updateAssetSchema,
  idSchema,
} from "../schemas/index.js";

export function registerAssetTools(server: FastMCP, api: LunchMoneyApi) {
  server.addTool({
    name: "getAssets",
    description: "List all manually-managed assets",
    parameters: z.object({}),
    execute: async () => {
      try {
        const response = await api.assets.list();
        return JSON.stringify(response, null, 2);
      } catch (error) {
        return formatErrorForMCP(error);
      }
    },
  });

  server.addTool({
    name: "createAsset",
    description: "Create a new manually-managed asset",
    parameters: createAssetSchema,
    execute: async (args: z.infer<typeof createAssetSchema>) => {
      try {
        const asset = await api.assets.create(args);
        return JSON.stringify(asset, null, 2);
      } catch (error) {
        return formatErrorForMCP(error);
      }
    },
  });

  server.addTool({
    name: "updateAsset",
    description: "Update an existing asset's properties including balance and metadata",
    parameters: idSchema.merge(updateAssetSchema),
    execute: async (args: z.infer<typeof idSchema> & z.infer<typeof updateAssetSchema>) => {
      try {
        const { id, ...updateData } = args;
        const asset = await api.assets.update(id, updateData);
        return JSON.stringify(asset, null, 2);
      } catch (error) {
        return formatErrorForMCP(error);
      }
    },
  });

  server.addTool({
    name: "deleteAsset",
    description: "Delete an asset by ID",
    parameters: idSchema,
    execute: async (args: z.infer<typeof idSchema>) => {
      try {
        await api.assets.delete(args.id);
        return `Asset ${args.id} deleted successfully`;
      } catch (error) {
        return formatErrorForMCP(error);
      }
    },
  });
}
