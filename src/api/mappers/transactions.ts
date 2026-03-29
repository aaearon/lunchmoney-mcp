import type { Transaction } from "../../types/index.js";
import type { V2Transaction, V2TransactionStatus } from "../../types/v2.js";

const v2ToV1Status: Record<string, string> = {
  reviewed: "cleared",
  unreviewed: "uncleared",
  delete_pending: "delete_pending",
};

const v1ToV2Status: Record<string, V2TransactionStatus | undefined> = {
  cleared: "reviewed",
  uncleared: "unreviewed",
  // Accept v2-native values as pass-through so callers that already
  // use v2 status strings (e.g. from mapped responses) don't break.
  reviewed: "reviewed",
  unreviewed: "unreviewed",
  // v1-only statuses with no v2 equivalent
  recurring: undefined,
  recurring_suggested: undefined,
};

/** Map a v2 transaction status to v1 equivalent. */
export function mapV2StatusToV1(status: string): string {
  return v2ToV1Status[status] ?? status;
}

/** Map a v1 transaction status to v2 equivalent. Returns undefined if no mapping. */
export function mapV1StatusToV2(status: string): V2TransactionStatus | undefined {
  return v1ToV2Status[status];
}

/** Map a v2 Transaction response to the MCP-facing Transaction type. */
export function mapV2TransactionToMCP(v2: V2Transaction): Transaction {
  return {
    id: v2.id,
    date: v2.date,
    payee: v2.payee,
    amount: v2.amount,
    currency: v2.currency,
    notes: v2.notes ?? undefined,
    category_id: v2.category_id ?? undefined,
    account_id: v2.manual_account_id ?? v2.plaid_account_id ?? 0,
    plaid_account_id: v2.plaid_account_id ?? undefined,
    status: mapV2StatusToV1(v2.status) as Transaction["status"],
    is_group: v2.is_group || undefined,
    group_id: v2.group_id ?? undefined,
    external_id: v2.external_id ?? undefined,
    original_name: v2.original_name ?? undefined,
    tags: v2.tags?.map((t) => ({ id: t.id, name: t.name })) ?? undefined,
    created_at: v2.created_at,
    updated_at: v2.updated_at,
  };
}

/** Map an MCP request body to v2 format for create/update operations. */
export function mapMCPRequestToV2(data: Record<string, unknown>): Record<string, unknown> {
  const { account_id, status, ...rest } = data;
  const result: Record<string, unknown> = { ...rest };

  // Map account_id to manual_account_id if no v2-specific fields provided
  if (account_id !== undefined && rest.manual_account_id === undefined && rest.plaid_account_id === undefined) {
    result.manual_account_id = account_id;
  }

  // Map status
  if (typeof status === "string") {
    const v2Status = mapV1StatusToV2(status);
    if (v2Status) {
      result.status = v2Status;
    }
  }

  return result;
}

/** Convert v1 filter params to v2 query params. Throws on unmappable status. */
export function mapV1FilterParamsToV2(
  params: Record<string, unknown>
): Record<string, unknown> {
  const { status, pending, account_id, ...rest } = params;
  const result: Record<string, unknown> = { ...rest };

  if (typeof status === "string") {
    const v2Status = mapV1StatusToV2(status);
    if (!v2Status) {
      throw new Error(`Status filter '${status}' is not supported by the v2 API`);
    }
    result.status = v2Status;
  }

  if (pending !== undefined) {
    result.include_pending = pending;
  }

  if (account_id !== undefined) {
    result.manual_account_id = account_id;
  }

  return result;
}
