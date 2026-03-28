import type { Asset } from "../../types/index.js";
import type { ManualAccount } from "../../types/v2.js";

/** Map a v2 ManualAccount response to the MCP-facing Asset type. */
export function mapManualAccountToAsset(account: ManualAccount): Asset {
  return {
    id: account.id,
    type_name: account.type,
    name: account.name,
    balance: account.balance,
    balance_as_of: account.balance_as_of,
    currency: account.currency,
    institution_name: account.institution_name,
    created_at: account.created_at,
    updated_at: account.updated_at,
  };
}

/** Map an MCP asset create/update request to v2 ManualAccount request body. */
export function mapAssetRequestToManualAccountRequest(
  data: Record<string, unknown>
): Record<string, unknown> {
  const { type_name, type_name_override, ...rest } = data;
  return {
    ...rest,
    ...(type_name !== undefined ? { type: type_name } : {}),
  };
}
