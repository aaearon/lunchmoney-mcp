import type { Tag } from "../../types/index.js";
import type { V2Tag } from "../../types/v2.js";

/** Map a v2 Tag to the MCP-facing Tag type, stripping v2-only fields. */
export function mapV2TagToTag(v2: V2Tag): Tag {
  return {
    id: v2.id,
    name: v2.name,
    created_at: v2.created_at,
  };
}
