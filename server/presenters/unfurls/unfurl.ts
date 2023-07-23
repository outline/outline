import { Unfurl } from "@shared/types";

function presentUnfurl(data: any): Unfurl {
  return {
    url: data.url,
    type: data.type,
    title: data.title,
    description: data.description,
    thumbnailUrl: data.thumbnail_url,
    meta: data.meta,
  };
}

export default presentUnfurl;
