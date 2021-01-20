// @flow
import { observer } from "mobx-react";
import * as React from "react";
import Document from "models/Document";
import DocumentListItem from "components/DocumentListItem";
import PaginatedList from "components/PaginatedList";

type Props = {
  documents: Document[],
  fetch: (options: ?Object) => Promise<void>,
  options?: Object,
  heading?: React.Node,
  empty?: React.Node,
};

@observer
class PaginatedDocumentList extends React.Component<Props> {
  render() {
    const { empty, heading, documents, fetch, options, ...rest } = this.props;

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
  }
}

export default PaginatedDocumentList;
