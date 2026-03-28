import type { Category } from "../../types/index.js";
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
 * Convert v1 addToGroup params to v2 PUT /categories/:id body.
 * v2 uses children array on PUT to replace group membership.
 */
export function mapAddToGroupRequestToV2Update(
  data: Record<string, unknown>
): Record<string, unknown> {
  const { category_ids, new_categories } = data;
  const children: Array<number | string> = [
    ...((category_ids as number[]) || []),
    ...((new_categories as string[]) || []),
  ];
  return { children };
}
