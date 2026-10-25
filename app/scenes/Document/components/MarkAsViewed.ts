import { useRef, useEffect, useState } from "react";
import useConsumeQueryParam from "~/hooks/useConsumeQueryParam";
import type Document from "~/models/Document";
import { SuppressViewParam } from "~/utils/suppressView";
import { isTruthyQueryValue } from "~/utils/urls";

const MARK_AS_VIEWED_AFTER = 3 * 1000;
type Props = {
  document: Document;
  children?: React.JSX.Element;
};

function MarkAsViewed(props: Props) {
  const { document, children } = props;
  const viewTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppress = isTruthyQueryValue(useConsumeQueryParam(SuppressViewParam));

  // Only the document that was linked to is suppressed, not any navigated to
  // afterwards.
  const [suppressedDocumentId] = useState(() =>
    suppress ? document.id : undefined
  );

  useEffect(() => {
    if (document.id === suppressedDocumentId) {
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
