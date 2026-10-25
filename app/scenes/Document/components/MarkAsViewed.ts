import { useRef, useEffect, useState } from "react";
import type Document from "~/models/Document";
import { clearSuppressView, shouldSuppressView } from "~/utils/suppressView";

const MARK_AS_VIEWED_AFTER = 3 * 1000;
type Props = {
  document: Document;
  children?: React.JSX.Element;
};

function MarkAsViewed(props: Props) {
  const { document, children } = props;
  const viewTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [suppressedDocumentId] = useState(() =>
    shouldSuppressView() ? document.id : undefined
  );

  useEffect(() => {
    if (document.id === suppressedDocumentId) {
      clearSuppressView();
      return;
    }

    viewTimeout.current = setTimeout(async () => {
      const view = await document.view();

      if (view) {
        document.updateLastViewed(view);
      }
    }, MARK_AS_VIEWED_AFTER);

    return () => {
      if (viewTimeout.current) {
        clearTimeout(viewTimeout.current);
      }
    };
  }, [document, suppressedDocumentId]);

  return children || null;
}

export default MarkAsViewed;
