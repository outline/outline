import { Unfurl, UnfurlType } from "@shared/types";
import { Document, User } from "@server/models";
import { presentLastOnlineInfoFor, presentLastViewedInfoFor } from "./common";

async function presentMention(
  user: User,
  document: Document
): Promise<Unfurl<UnfurlType.Mention>> {
  const lastOnlineInfo = presentLastOnlineInfoFor(user);
  const lastViewedInfo = await presentLastViewedInfoFor(user, document);

  return {
    type: UnfurlType.Mention,
    title: user.name,
    description: `${lastOnlineInfo} • ${lastViewedInfo}`,
    thumbnailUrl: user.avatarUrl,
    meta: {
      id: user.id,
      color: user.color,
    },
  };
}

export default presentMention;
