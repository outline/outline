import * as React from "react";
import { useTranslation } from "react-i18next";
import type Document from "~/models/Document";
import DocumentListItem from "~/components/DocumentListItem";
import DocumentSelectionToolbar from "~/components/DocumentSelectionToolbar";
import Error from "~/components/List/Error";
import { ModelSelectionProvider } from "~/components/ModelSelectionContext";
import PaginatedList from "~/components/PaginatedList";
import useStores from "~/hooks/useStores";

type Props = {
  documents: Document[];
  // oxlint-disable-next-line no-explicit-any
  fetch: (options: Record<string, any>) => Promise<Document[] | undefined>;
  // oxlint-disable-next-line no-explicit-any
  options?: Record<string, any>;
  heading?: React.ReactNode;
  empty?: JSX.Element;
  showParentDocuments?: boolean;
  showCollection?: boolean;
  showPublished?: boolean;
  showDraft?: boolean;
  showTemplate?: boolean;
};

const PaginatedDocumentList = React.memo<Props>(function PaginatedDocumentList({
  empty,
  heading,
  documents,
  fetch,
  options,
  showParentDocuments,
  showCollection,
  showPublished,
  showTemplate,
  showDraft,
  ...rest
}: Props) {
  const { t } = useTranslation();
  const { policies } = useStores();
  // Only updatable documents are selectable, so that is what feeds range and
  // select-all; per-item checkboxes are gated on the same ability.
  const itemIds = React.useMemo(
    () =>
      documents
        .filter((document) => policies.abilities(document.id).update)
        .map((document) => document.id),
    [documents, policies]
  );

  return (
    <ModelSelectionProvider
      items={itemIds}
      toolbar={<DocumentSelectionToolbar />}
    >
      <PaginatedList<Document>
        aria-label={t("Documents")}
        items={documents}
        empty={empty}
        heading={heading}
        fetch={fetch}
        options={options}
        renderError={(props) => <Error {...props} />}
        renderItem={(item, _index) => (
          <DocumentListItem
            key={item.id}
            document={item}
            showParentDocuments={showParentDocuments}
            showCollection={showCollection}
            showPublished={showPublished}
            showDraft={showDraft}
          />
        )}
        {...rest}
      />
    </ModelSelectionProvider>
  );
});

export default PaginatedDocumentList;
