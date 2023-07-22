import { Unfurl, UnfurlType } from "@shared/types";
import { Document, User } from "@server/models";
import { presentLastOnlineInfoFor, presentLastViewedInfoFor } from "./common";

function presentMention(
  user: User,
  document: Document
): Unfurl<UnfurlType.Mention> {
  return {
    type: UnfurlType.Mention,
    title: user.name,
    description: `${presentLastOnlineInfoFor(
      user
    )} • ${presentLastViewedInfoFor(user, document)}`,
    thumbnailUrl: user.avatarUrl,
    meta: {
      id: user.id,
      color: user.color,
    },
  };
}

export default presentMention;
