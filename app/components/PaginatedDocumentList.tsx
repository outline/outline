import * as React from "react";
import { useTranslation } from "react-i18next";
import Document from "~/models/Document";
import DocumentListItem from "~/components/DocumentListItem";
import Error from "~/components/List/Error";
import PaginatedList from "~/components/PaginatedList";

type Props = {
  documents: Document[];
  fetch: (options: any) => Promise<Document[] | undefined>;
  options?: Record<string, any>;
  heading?: React.ReactNode;
  empty?: React.ReactNode;
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

  return (
    <PaginatedList
      aria-label={t("Documents")}
      items={documents}
      empty={empty}
      heading={heading}
      fetch={fetch}
      options={options}
      renderError={(props) => <Error {...props} />}
      renderItem={(item: Document, _index) => (
        <DocumentListItem
          key={item.id}
          document={item}
          showPin={!!options?.collectionId}
          showParentDocuments={showParentDocuments}
          showCollection={showCollection}
          showPublished={showPublished}
          showTemplate={showTemplate}
          showDraft={showDraft}
        />
      )}
      {...rest}
    />
  );
});

export default PaginatedDocumentList;
