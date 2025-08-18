import useQuery from "~/hooks/useQuery";
import useStores from "./useStores";
import { useDocumentContext } from "~/components/DocumentContext";

export default function useFocusedComment() {
  const { comments } = useStores();
  const context = useDocumentContext();
  const query = useQuery();
  const focusedCommentId = context.focusedCommentId || query.get("commentId");
  const comment = focusedCommentId ? comments.get(focusedCommentId) : undefined;

  return comment?.parentCommentId
    ? comments.get(comment.parentCommentId)
    : comment;
}
