import { HttpClient, type ErrorParser } from "./http-client.js";

export const V1_BASE_URL = "https://dev.lunchmoney.app/v1";

/** Parses v1 error format: { error: string } */
export const parseV1Error: ErrorParser = (errorData) => {
  if (
    typeof errorData === "object" &&
    errorData !== null &&
    "error" in errorData &&
    typeof (errorData as Record<string, unknown>).error === "string"
  ) {
    return (errorData as Record<string, string>).error;
  }
  return null;
};

export function createV1Client(accessToken: string): HttpClient {
  return new HttpClient({
    baseUrl: V1_BASE_URL,
    accessToken,
    parseError: parseV1Error,
  });
}
