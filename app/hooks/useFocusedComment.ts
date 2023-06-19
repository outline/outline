import { useLocation } from "react-router-dom";
import useQuery from "~/hooks/useQuery";
import useStores from "./useStores";

export default function useFocusedComment() {
  const { comments } = useStores();
  const location = useLocation<{ commentId?: string }>();
  const query = useQuery();
  const focusedCommentId = location.state?.commentId || query.get("commentId");
  const comment = focusedCommentId ? comments.get(focusedCommentId) : undefined;

  return comment?.parentCommentId
    ? comments.get(comment.parentCommentId)
    : comment;
}
