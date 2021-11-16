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
      // @ts-expect-error ts-migrate(2322) FIXME: Type '{ items: Document[]; empty: ReactNode; headi... Remove this comment to see the full error message
      items={documents}
      empty={empty}
      heading={heading}
      fetch={fetch}
      options={options}
      // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'item' implicitly has an 'any' type.
      renderItem={(item) => (
        <DocumentListItem key={item.id} document={item} {...rest} />
      )}
    />
  );
});

export default PaginatedDocumentList;
