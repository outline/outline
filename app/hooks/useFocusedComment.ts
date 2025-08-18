import useQuery from "~/hooks/useQuery";
import useStores from "./useStores";
import { useDocumentContext } from "~/components/DocumentContext";
import { useEffect } from "react";
import { useHistory } from "react-router-dom";

export default function useFocusedComment() {
  const { comments } = useStores();
  const context = useDocumentContext();
  const query = useQuery();
  const focusedCommentId = context.focusedCommentId || query.get("commentId");
  const comment = focusedCommentId ? comments.get(focusedCommentId) : undefined;
  const history = useHistory();

  // Move the query string into context
  useEffect(() => {
    if (focusedCommentId && context.focusedCommentId !== focusedCommentId) {
      context.setFocusedCommentId(focusedCommentId);
    }
  }, [focusedCommentId, context]);

  // Clear query string from location
  useEffect(() => {
    if (focusedCommentId) {
      const params = new URLSearchParams(history.location.search);
      params.delete("commentId");
      history.replace({
        pathname: history.location.pathname,
        search: params.toString(),
        state: history.location.state,
      });
    }
  }, []);

  return comment?.parentCommentId
    ? comments.get(comment.parentCommentId)
    : comment;
}
