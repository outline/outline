import { UnfurlResponse } from "@shared/types";

function presentUnfurl(data: any): UnfurlResponse {
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

export default presentUnfurl;
