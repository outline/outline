import { Emoji } from "@server/models";
import presentUser from "./user";

export default function present(emoji: Emoji) {
  return {
    id: emoji.id,
    name: emoji.name,
    url: emoji.url,
    teamId: emoji.teamId,
    createdBy: emoji.createdBy ? presentUser(emoji.createdBy) : undefined,
    createdById: emoji.createdById,
    createdAt: emoji.createdAt,
    updatedAt: emoji.updatedAt,
  };
}
