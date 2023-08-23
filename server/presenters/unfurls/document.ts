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
    description: document.getSummary(),
    meta: {
      id: document.id,
      info: presentLastActivityInfoFor(document, viewer),
    },
  };
}

export default presentDocument;
