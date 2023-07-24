import { IframelyErrorResponse, Unfurl } from "@shared/types";

function presentUnfurl(data: any): Unfurl | IframelyErrorResponse {
  return !data.error
    ? {
        url: data.url,
        type: data.type,
        title: data.title,
        description: data.description,
        thumbnailUrl: data.thumbnail_url,
        meta: data.meta,
      }
    : {
        status: data.status,
        error: data.error,
      };
}

export default presentUnfurl;
