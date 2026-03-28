import { describe, it, expect } from "vitest";
import { mapV2TagToTag } from "../../../src/api/mappers/tags.js";
import type { V2Tag } from "../../../src/types/v2.js";

describe("Tag mappers", () => {
  describe("mapV2TagToTag", () => {
    it("strips v2-only fields", () => {
      const v2Tag: V2Tag = {
        id: 1,
        name: "Wedding",
        description: "All wedding expenses",
        text_color: "#000000",
        background_color: "#FF5733",
        updated_at: "2024-06-01T00:00:00Z",
        created_at: "2024-01-01T00:00:00Z",
        archived: false,
        archived_at: null,
      };

      const result = mapV2TagToTag(v2Tag);

      expect(result).toEqual({
        id: 1,
        name: "Wedding",
        created_at: "2024-01-01T00:00:00Z",
      });
      expect(result).not.toHaveProperty("text_color");
      expect(result).not.toHaveProperty("background_color");
      expect(result).not.toHaveProperty("archived");
      expect(result).not.toHaveProperty("archived_at");
      expect(result).not.toHaveProperty("description");
    });
  });
});
