// @flow
import * as React from 'react';
import { observer } from 'mobx-react';
import Document from 'models/Document';
import DocumentPreview from 'components/DocumentPreview';
import PaginatedList from 'components/PaginatedList';

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
        renderItem={item => (
          <DocumentPreview key={item.id} document={item} {...rest} />
        )}
      />
    );
  }
}

export default PaginatedDocumentList;
