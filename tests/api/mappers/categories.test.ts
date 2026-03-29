import { describe, it, expect } from "vitest";
import {
  mapV2CategoryToCategory,
  extractCategoryGroups,
  mapCategoryRequestToV2,
  mapCategoryGroupRequestToV2,
  mapAddToGroupRequestToV2Update,
} from "../../../src/api/mappers/categories.js";
import type { V2Category } from "../../../src/types/v2.js";

const sampleV2Category: V2Category = {
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

const sampleV2Group: V2Category = {
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

describe("Category mappers", () => {
  describe("mapV2CategoryToCategory", () => {
    it("maps a basic v2 category to MCP Category", () => {
      const result = mapV2CategoryToCategory(sampleV2Category);
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

    it("maps a category group (group_id is undefined)", () => {
      const result = mapV2CategoryToCategory(sampleV2Group);
      expect(result.category_group_id).toBeUndefined();
    });
  });

  describe("extractCategoryGroups", () => {
    it("extracts groups from a mixed list of categories", () => {
      const result = extractCategoryGroups([sampleV2Category, sampleV2Group]);
      expect(result).toEqual([
        { id: 5, name: "Food & Drink", created_at: "2024-01-01T00:00:00Z" },
      ]);
    });

    it("returns empty array when no groups exist", () => {
      expect(extractCategoryGroups([sampleV2Category])).toEqual([]);
    });
  });

  describe("mapCategoryRequestToV2", () => {
    it("translates exclude_budget to exclude_from_budget", () => {
      const result = mapCategoryRequestToV2({
        name: "Test",
        exclude_budget: true,
      });
      expect(result.exclude_from_budget).toBe(true);
      expect(result).not.toHaveProperty("exclude_budget");
    });

    it("translates category_group_id to group_id", () => {
      const result = mapCategoryRequestToV2({
        name: "Test",
        category_group_id: 5,
      });
      expect(result.group_id).toBe(5);
      expect(result).not.toHaveProperty("category_group_id");
    });

    it("drops parent_category_id (no v2 equivalent)", () => {
      const result = mapCategoryRequestToV2({
        name: "Test",
        parent_category_id: 10,
      });
      expect(result).not.toHaveProperty("parent_category_id");
    });

    it("passes through other fields unchanged", () => {
      const result = mapCategoryRequestToV2({
        name: "Test",
        description: "Desc",
        is_income: true,
      });
      expect(result).toEqual({
        name: "Test",
        description: "Desc",
        is_income: true,
      });
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
      const result = mapCategoryGroupRequestToV2({ name: "Empty Group" });
      expect(result).toEqual({
        name: "Empty Group",
        is_group: true,
        children: [],
      });
    });
  });

  describe("mapAddToGroupRequestToV2Update", () => {
    it("merges new IDs with existing children", () => {
      const result = mapAddToGroupRequestToV2Update(
        { category_ids: [20, 30], new_categories: ["Snacks"] },
        [10, 20]  // existing children — 20 is a dup
      );
      expect(result).toEqual({
        children: [10, 20, 30, "Snacks"],
      });
    });

    it("handles empty existing children", () => {
      const result = mapAddToGroupRequestToV2Update(
        { category_ids: [10] },
        []
      );
      expect(result).toEqual({ children: [10] });
    });
  });
});
