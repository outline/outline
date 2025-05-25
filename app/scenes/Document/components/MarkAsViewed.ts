import { useRef, useEffect } from "react";
import Document from "~/models/Document";

const MARK_AS_VIEWED_AFTER = 3 * 1000;
type Props = {
  document: Document;
  children?: JSX.Element;
};

function MarkAsViewed(props: Props) {
  const { document, children } = props;
  const viewTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    viewTimeout.current = setTimeout(async () => {
      const view = await document.view();

      if (view) {
        document.updateLastViewed(view);
      }
    }, MARK_AS_VIEWED_AFTER);

    return () => {
      viewTimeout.current && clearTimeout(viewTimeout.current);
    };
  }, [document]);

  return children || null;
}

export default MarkAsViewed;
