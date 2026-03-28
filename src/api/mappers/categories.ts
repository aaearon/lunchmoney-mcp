import type { Category, CategoryGroup } from "../../types/index.js";
import type { V2Category } from "../../types/v2.js";

/** Map a v2 Category to the MCP-facing Category type. */
export function mapV2CategoryToCategory(v2: V2Category): Category {
  return {
    id: v2.id,
    name: v2.name,
    description: v2.description ?? undefined,
    is_income: v2.is_income,
    exclude_budget: v2.exclude_from_budget,
    exclude_from_totals: v2.exclude_from_totals,
    archived: v2.archived,
    category_group_id: v2.group_id ?? undefined,
    created_at: v2.created_at,
    updated_at: v2.updated_at,
  };
}

/** Extract CategoryGroup objects from v2 categories that have is_group=true. */
export function extractCategoryGroups(v2Categories: V2Category[]): CategoryGroup[] {
  return v2Categories
    .filter((c) => c.is_group)
    .map((c) => ({ id: c.id, name: c.name, created_at: c.created_at }));
}

/**
 * Map MCP category request fields to v2 field names.
 * Translates: exclude_budget → exclude_from_budget, category_group_id → group_id.
 */
export function mapCategoryRequestToV2(
  data: Record<string, unknown>
): Record<string, unknown> {
  const { exclude_budget, category_group_id, parent_category_id, ...rest } = data;
  const result: Record<string, unknown> = { ...rest };

  if (exclude_budget !== undefined) {
    result.exclude_from_budget = exclude_budget;
  }
  if (category_group_id !== undefined) {
    result.group_id = category_group_id;
  }
  // parent_category_id has no v2 equivalent — drop it
  return result;
}

/**
 * Convert v1 createCategoryGroup params to v2 POST /categories body.
 * v2 folds group creation into POST /categories with is_group: true
 * and a children array of IDs and/or name strings.
 */
export function mapCategoryGroupRequestToV2(
  data: Record<string, unknown>
): Record<string, unknown> {
  const { category_ids, new_categories, ...rest } = data;
  const children: Array<number | string> = [
    ...((category_ids as number[]) || []),
    ...((new_categories as string[]) || []),
  ];
  return {
    ...rest,
    is_group: true,
    children,
  };
}

/**
 * Build v2 PUT body for addToGroup that merges new IDs with existing children.
 * v2 PUT /categories/:id replaces the full children list, so we must include
 * existing children to avoid removing them.
 */
export function mapAddToGroupRequestToV2Update(
  data: Record<string, unknown>,
  existingChildIds: number[]
): Record<string, unknown> {
  const { category_ids, new_categories } = data;
  const newIds = (category_ids as number[]) || [];
  const newNames = (new_categories as string[]) || [];
  // Merge existing + new, dedup IDs
  const mergedIds = [...new Set([...existingChildIds, ...newIds])];
  const children: Array<number | string> = [...mergedIds, ...newNames];
  return { children };
}
