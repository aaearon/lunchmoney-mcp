import { describe, it, expect } from "vitest";
import {
  mapV2CategoryToCategory,
  mapCategoryGroupRequestToV2,
  mapAddToGroupRequestToV2Update,
} from "../../../src/api/mappers/categories.js";
import type { V2Category } from "../../../src/types/v2.js";

describe("Category mappers", () => {
  describe("mapV2CategoryToCategory", () => {
    it("maps a basic v2 category to MCP Category", () => {
      const v2: V2Category = {
        id: 10,
        name: "Groceries",
        description: "Food shopping",
        is_income: false,
        exclude_from_budget: false,
        exclude_from_totals: false,
        updated_at: "2024-06-01T00:00:00Z",
        created_at: "2024-01-01T00:00:00Z",
        group_id: 5,
        is_group: false,
        archived: false,
        archived_at: null,
        order: 2,
        collapsed: false,
      };

      const result = mapV2CategoryToCategory(v2);

      expect(result).toEqual({
        id: 10,
        name: "Groceries",
        description: "Food shopping",
        is_income: false,
        exclude_budget: false,
        exclude_from_totals: false,
        archived: false,
        category_group_id: 5,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-06-01T00:00:00Z",
      });
    });

    it("maps a category group with children", () => {
      const v2: V2Category = {
        id: 5,
        name: "Food & Drink",
        description: null,
        is_income: false,
        exclude_from_budget: false,
        exclude_from_totals: false,
        updated_at: "2024-06-01T00:00:00Z",
        created_at: "2024-01-01T00:00:00Z",
        group_id: null,
        is_group: true,
        children: [
          {
            id: 10, name: "Groceries", description: null,
            is_income: false, exclude_from_budget: false, exclude_from_totals: false,
            updated_at: "2024-06-01T00:00:00Z", created_at: "2024-01-01T00:00:00Z",
            group_id: 5, is_group: false, archived: false, archived_at: null,
            order: 0, collapsed: false,
          },
        ],
        archived: false,
        archived_at: null,
        order: 0,
        collapsed: true,
      };

      const result = mapV2CategoryToCategory(v2);

      expect(result.is_income).toBe(false);
      expect(result.category_group_id).toBeUndefined();
    });
  });

  describe("mapCategoryGroupRequestToV2", () => {
    it("converts createCategoryGroup params to v2 POST /categories body", () => {
      const result = mapCategoryGroupRequestToV2({
        name: "Food & Drink",
        description: "All food expenses",
        category_ids: [10, 20],
        new_categories: ["Snacks"],
      });

      expect(result).toEqual({
        name: "Food & Drink",
        description: "All food expenses",
        is_group: true,
        children: [10, 20, "Snacks"],
      });
    });

    it("handles empty arrays", () => {
      const result = mapCategoryGroupRequestToV2({
        name: "Empty Group",
      });

      expect(result).toEqual({
        name: "Empty Group",
        is_group: true,
        children: [],
      });
    });
  });

  describe("mapAddToGroupRequestToV2Update", () => {
    it("converts addToGroup params to v2 PUT body with children", () => {
      const result = mapAddToGroupRequestToV2Update({
        category_ids: [10, 20],
        new_categories: ["Snacks"],
      });

      expect(result).toEqual({
        children: [10, 20, "Snacks"],
      });
    });
  });
});
