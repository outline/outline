import { useRef, useEffect } from "react";
import type Note from "~/models/Note";
const MARK_AS_VIEWED_AFTER = 3 * 1000;
type Props = {
  note: Note;
  children?: JSX.Element;
};
function MarkAsViewed(props: Props) {
  const { note, children } = props;
  const viewTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    viewTimeout.current = setTimeout(async () => {
      const view = await note.view();
      if (view) {
        note.updateLastViewed(view);
      }
    }, MARK_AS_VIEWED_AFTER);
    return () => {
      if (viewTimeout.current) {
        clearTimeout(viewTimeout.current);
      }
    };
  }, [note]);
  return children || null;
}
export default MarkAsViewed;
