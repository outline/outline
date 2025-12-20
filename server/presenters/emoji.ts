import type { Emoji } from "@server/models";
import presentUser from "./user";

export default function present(emoji: Emoji) {
  return {
    id: emoji.id,
    name: emoji.name,
    teamId: emoji.teamId,
    url: emoji.attachment?.url,
    createdBy: emoji.createdBy ? presentUser(emoji.createdBy) : undefined,
    createdById: emoji.createdById,
    createdAt: emoji.createdAt,
    updatedAt: emoji.updatedAt,
  };
}
