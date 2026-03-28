import { HttpClient, type ErrorParser } from "./http-client.js";

export const V2_BASE_URL = "https://api.lunchmoney.dev/v2";

/** Parses v2 error format: { message: string, errors: [{ errMsg: string }] } */
export const parseV2Error: ErrorParser = (errorData) => {
  if (
    typeof errorData === "object" &&
    errorData !== null &&
    "message" in errorData &&
    typeof (errorData as Record<string, unknown>).message === "string"
  ) {
    const data = errorData as { message: string; errors?: Array<{ errMsg: string }> };
    const details = data.errors
      ?.map((e) => e.errMsg)
      .filter(Boolean)
      .join("; ");
    return details ? `${data.message}: ${details}` : data.message;
  }
  return null;
};

export function createV2Client(accessToken: string): HttpClient {
  return new HttpClient({
    baseUrl: V2_BASE_URL,
    accessToken,
    parseError: parseV2Error,
  });
}
