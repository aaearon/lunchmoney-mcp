import type { V2TransactionStatus } from "../../types/v2.js";

const v2ToV1Status: Record<string, string> = {
  reviewed: "cleared",
  unreviewed: "uncleared",
  delete_pending: "delete_pending",
};

const v1ToV2Status: Record<string, V2TransactionStatus | undefined> = {
  cleared: "reviewed",
  uncleared: "unreviewed",
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

/** Convert v1 filter params to v2 query params. */
export function mapV1FilterParamsToV2(
  params: Record<string, unknown>
): Record<string, unknown> {
  const { status, pending, account_id, ...rest } = params;
  const result: Record<string, unknown> = { ...rest };

  if (typeof status === "string") {
    const v2Status = mapV1StatusToV2(status);
    if (v2Status) {
      result.status = v2Status;
    }
  }

  if (pending !== undefined) {
    result.include_pending = pending;
  }

  if (account_id !== undefined) {
    result.manual_account_id = account_id;
  }

  return result;
}
