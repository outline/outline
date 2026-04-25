import type { DocumentInsight } from "@server/models";

export default function presentDocumentInsight(insight: DocumentInsight) {
  return {
    date: insight.date,
    viewCount: insight.viewCount,
    viewerCount: insight.viewerCount,
    commentCount: insight.commentCount,
    reactionCount: insight.reactionCount,
    revisionCount: insight.revisionCount,
    editorCount: insight.editorCount,
  };
}
