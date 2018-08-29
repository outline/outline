// @flow
import * as React from 'react';
import { observer, inject } from 'mobx-react';
import { Link, withRouter } from 'react-router-dom';

import Time from 'shared/components/Time';
import Flex from 'shared/components/Flex';
import { documentHistoryUrl } from 'utils/routeHelpers';

import Document from 'models/Document';
import RevisionsStore from 'stores/RevisionsStore';

type Props = {
  match: Object,
  history: Object,
  document: Document,
  revisions: RevisionsStore,
};

@observer
class DocumentHistory extends React.Component<Props> {
  componentDidMount() {
    this.props.revisions.fetchPage({ id: this.props.document.id });
  }

  handleClose = () => {
    this.props.history.push(this.props.document.url);
  };

  render() {
    const revisions = this.props.revisions.getDocumentRevisions(
      this.props.document.id
    );

    return (
      <Flex column>
        {revisions.map((revision, index) => (
          <Link
            key={revision.id}
            to={documentHistoryUrl(this.props.document, revision.id)}
            k
          >
            <h3>{revision.createdBy.name}</h3>
            <p>
              <Time dateTime={revision.createdAt} /> ago
            </p>
            <hr />
          </Link>
        ))}
      </Flex>
    );
  }
}

export default withRouter(inject('documents', 'revisions')(DocumentHistory));
