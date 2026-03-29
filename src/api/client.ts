/**
 * Backward-compatible LunchMoneyClient.
 *
 * Preserves the `new LunchMoneyClient(token)` constructor that existing
 * code uses. Internally delegates to HttpClient with v1 configuration.
 *
 * New code should use createV1Client / createV2Client or the API facade.
 */
import { HttpClient } from "./http-client.js";
import { V1_BASE_URL, parseV1Error } from "./v1-client.js";

export { HttpClient };

export class LunchMoneyClient extends HttpClient {
  constructor(accessToken: string) {
    if (!accessToken) {
      throw new Error("Lunch Money API token is required");
    }
    super({
      baseUrl: V1_BASE_URL,
      accessToken,
      parseError: parseV1Error,
    });
  }
}
