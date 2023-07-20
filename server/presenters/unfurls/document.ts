import { Unfurl, UnfurlType } from "@shared/types";
import { User, Document } from "@server/models";
import { presentLastActivityInfoFor } from "./common";

function presentDocument(
  document: Document,
  viewer: User
): Unfurl<UnfurlType.Document> {
  return {
    url: document.url,
    type: UnfurlType.Document,
    title: document.titleWithDefault,
    description: presentLastActivityInfoFor(document, viewer),
    meta: {
      id: document.id,
      summary: document.getSummary(),
    },
  };
}

export default presentDocument;
