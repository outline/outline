import { Reaction } from "@server/models";
import presentUser from "./user";

export default function present(reaction: Reaction) {
  return {
    id: reaction.id,
    emoji: reaction.emoji,
    commentId: reaction.commentId,
    user: presentUser(reaction.user),
    userId: reaction.userId,
    createdAt: reaction.createdAt,
    updatedAt: reaction.updatedAt,
  };
}
