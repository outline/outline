import * as React from "react";
import { useTranslation } from "react-i18next";
import { CollectionDisplay } from "@shared/types";
import Document from "~/models/Document";
import DocumentListItem from "~/components/DocumentListItem";
import Error from "~/components/List/Error";
import PaginatedList from "~/components/PaginatedList";
import DocumentPostItem from "./DocumentPostItem";

type Props = {
  documents: Document[];
  fetch: (options: any) => Promise<Document[] | undefined>;
  options?: Record<string, any>;
  heading?: React.ReactNode;
  empty?: React.ReactNode;
  display?: CollectionDisplay;
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
  display,
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
      renderItem={(item: Document, _index) =>
        display === CollectionDisplay.List ? (
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
        ) : (
          <DocumentPostItem
            key={item.id}
            document={item}
            showPin={!!options?.collectionId}
            showParentDocuments={showParentDocuments}
            showCollection={showCollection}
            showPublished={showPublished}
            showDraft={showDraft}
          />
        )
      }
      {...rest}
    />
  );
});

export default PaginatedDocumentList;
