export class LunchMoneyAPIError extends Error {
    constructor(
        message: string,
        public statusCode?: number,
        public response?: unknown,
        public errors?: Array<{ errMsg: string }>
    ) {
        super(message);
        this.name = "LunchMoneyAPIError";
    }
}

export function handleAPIError(error: unknown): never {
    if (error instanceof LunchMoneyAPIError) {
        throw error;
    }

    if (error instanceof Error) {
        throw new LunchMoneyAPIError(error.message);
    }

    throw new LunchMoneyAPIError("Unknown error occurred");
}

export function formatErrorForMCP(error: unknown): string {
    if (error instanceof LunchMoneyAPIError) {
        let msg = `Lunch Money API Error: ${error.message}`;
        if (error.statusCode) {
            msg += ` (Status: ${error.statusCode})`;
        }
        if (error.errors?.length) {
            msg += ` [${error.errors.map((e) => e.errMsg).join("; ")}]`;
        }
        return msg;
    }

    if (error instanceof Error) {
        return `Error: ${error.message}`;
    }

    return "An unknown error occurred";
}
