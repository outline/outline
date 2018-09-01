// @flow
import * as React from 'react';
import { withRouter } from 'react-router-dom';
import { observer, inject } from 'mobx-react';
import styled from 'styled-components';
import ArrowKeyNavigation from 'boundless-arrow-key-navigation';

import Flex from 'shared/components/Flex';
import Revision from './components/Revision';
import { documentHistoryUrl } from 'utils/routeHelpers';

import Document from 'models/Document';
import RevisionsStore from 'stores/RevisionsStore';

type Props = {
  match: Object,
  document: Document,
  revisions: RevisionsStore,
  revision?: Object,
  history: Object,
};

@observer
class DocumentHistory extends React.Component<Props> {
  async componentDidMount() {
    await this.props.revisions.fetchPage({ id: this.props.document.id });
    this.selectFirstRevision();
  }

  selectFirstRevision = () => {
    const revisions = this.revisions;
    if (revisions.length && !this.props.revision) {
      this.props.history.replace(
        documentHistoryUrl(this.props.document, this.revisions[0].id)
      );
    }
  };

  get revisions() {
    return this.props.revisions.getDocumentRevisions(this.props.document.id);
  }

  render() {
    return (
      <Wrapper column>
        <ArrowKeyNavigation
          mode={ArrowKeyNavigation.mode.VERTICAL}
          defaultActiveChildIndex={0}
        >
          {this.revisions.map(revision => (
            <Revision
              key={revision.id}
              revision={revision}
              document={this.props.document}
            />
          ))}
        </ArrowKeyNavigation>
      </Wrapper>
    );
  }
}

const Wrapper = styled(Flex)`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;

  min-width: ${props => props.theme.sidebarWidth};
  border-left: 1px solid ${props => props.theme.slateLight};
  overflow: scroll;
`;

export default withRouter(inject('documents', 'revisions')(DocumentHistory));
