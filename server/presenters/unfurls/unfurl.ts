import { UnfurlResourceType } from "@shared/types";
import presentMention from "./mention";

async function presentUnfurl(data: any) {
  switch (data.type) {
    case UnfurlResourceType.Mention:
      return presentMention(data.user, data.document);
    default:
      return {
        url: data.url,
        type: data.type,
        title: data.title,
        createdAt: data.createdAt,
        description: data.description,
        thumbnailUrl: data.thumbnail_url,
        author: data.author,
        meta: data.meta,
      };
  }
}

export default presentUnfurl;
