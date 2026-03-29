import type { PlaidAccount } from "../../types/index.js";
import type { V2PlaidAccount } from "../../types/v2.js";

/** Map a v2 PlaidAccount response to the MCP-facing PlaidAccount type. */
export function mapV2PlaidAccountToMCP(v2: V2PlaidAccount): PlaidAccount {
  const parsed = parseInt(v2.plaid_item_id, 10);
  return {
    id: v2.id,
    date_linked: v2.date_linked,
    name: v2.name,
    display_name: v2.display_name,
    type: v2.type,
    subtype: v2.subtype,
    mask: v2.mask,
    institution_name: v2.institution_name,
    status: v2.status,
    balance: v2.balance,
    currency: v2.currency,
    balance_last_update: v2.balance_last_update,
    limit: v2.limit ?? undefined,
    plaid_item_id: Number.isNaN(parsed) ? undefined : parsed,
    linked_by_name: v2.linked_by_name,
    allow_transaction_modifications: v2.allow_transaction_modifications,
    to_base: v2.to_base,
    import_start_date: v2.import_start_date,
    last_import: v2.last_import,
    last_fetch: v2.last_fetch,
    plaid_last_successful_update: v2.plaid_last_successful_update,
  };
}
