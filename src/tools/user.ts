import { FastMCP } from "fastmcp";
import { z } from "zod";
import type { LunchMoneyApi } from "../api/facade.js";
import { formatErrorForMCP } from "../utils/errors.js";

export function registerUserTools(server: FastMCP, api: LunchMoneyApi) {
    server.addTool({
        name: "getUser",
        description: "Get the current user's account details including email, name, currency preferences, and settings",
        parameters: z.object({}),
        execute: async () => {
            try {
                const user = await api.user.get();
                return JSON.stringify(user, null, 2);
            } catch (error) {
                return formatErrorForMCP(error);
            }
        },
    });
}
