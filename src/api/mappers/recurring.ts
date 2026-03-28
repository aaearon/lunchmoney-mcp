import type { RecurringItem } from "../../types/index.js";
import type { V2RecurringItem } from "../../types/v2.js";

/**
 * Convert v2 granularity + quantity into a human-readable frequency string
 * that matches what v1 returned.
 */
function toFrequencyString(granularity: string, quantity: number): string {
  if (quantity === 1) {
    const map: Record<string, string> = {
      day: "daily",
      week: "weekly",
      month: "monthly",
      year: "yearly",
    };
    return map[granularity] ?? granularity;
  }
  return `every ${quantity} ${granularity}s`;
}

/**
 * Flatten a v2 RecurringItem (nested transaction_criteria/overrides/matches)
 * into the flat MCP-facing RecurringItem type.
 */
export function mapV2RecurringItemToV1(v2: V2RecurringItem): RecurringItem {
  const criteria = v2.transaction_criteria;
  const overrides = v2.overrides;

  return {
    id: v2.id,
    payee: criteria.payee ?? undefined,
    amount: criteria.amount,
    currency: criteria.currency,
    category_id: overrides.category_id,
    notes: v2.description || undefined,
    account_id: criteria.manual_account_id ?? undefined,
    frequency: toFrequencyString(criteria.granularity, criteria.quantity),
    start_date: criteria.start_date ?? undefined,
    end_date: criteria.end_date ?? undefined,
    created_at: v2.created_at,
    updated_at: v2.updated_at,
  };
}
