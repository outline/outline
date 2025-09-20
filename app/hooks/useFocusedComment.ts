import useQuery from "~/hooks/useQuery";
import useStores from "./useStores";
import { useDocumentContext } from "~/components/DocumentContext";
import { useEffect } from "react";
import { useHistory } from "react-router-dom";

/**
 * Custom hook to retrieve the currently focused comment in a document.
 * It checks both the document context and the query string for the comment ID.
 * If a comment is focused, it returns the comment itself or the parent thread if it exists
 */
export function useFocusedComment() {
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

      if (params.get("commentId") === focusedCommentId) {
        params.delete("commentId");
        history.replace({
          pathname: history.location.pathname,
          search: params.toString(),
          state: history.location.state,
        });
      }
    }
  }, [focusedCommentId, history]);

  return comment?.parentCommentId
    ? comments.get(comment.parentCommentId)
    : comment;
}
