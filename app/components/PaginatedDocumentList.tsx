import * as React from "react";
import Document from "models/Document";
import DocumentListItem from "components/DocumentListItem";
import PaginatedList from "components/PaginatedList";
type Props = {
  documents: Document[];
  fetch: (options: Record<string, any> | null | undefined) => Promise<void>;
  options?: Record<string, any>;
  heading?: React.ReactNode;
  empty?: React.ReactNode;
  showNestedDocuments?: boolean;
  showCollection?: boolean;
  showPublished?: boolean;
  showPin?: boolean;
  showDraft?: boolean;
  showTemplate?: boolean;
};
const PaginatedDocumentList = React.memo<Props>(function PaginatedDocumentList({
  empty,
  heading,
  documents,
  fetch,
  options,
  ...rest
}: Props) {
  return (
    <PaginatedList
      items={documents}
      empty={empty}
      heading={heading}
      fetch={fetch}
      options={options}
      renderItem={(item) => (
        <DocumentListItem key={item.id} document={item} {...rest} />
      )}
    />
  );
});
export default PaginatedDocumentList;
