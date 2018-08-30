// @flow
import * as React from 'react';
import { observer, inject } from 'mobx-react';
import styled from 'styled-components';

import Flex from 'shared/components/Flex';
import Revision from './components/Revision';

import Document from 'models/Document';
import RevisionsStore from 'stores/RevisionsStore';

type Props = {
  match: Object,
  document: Document,
  revisions: RevisionsStore,
  revision?: Object,
};

@observer
class DocumentHistory extends React.Component<Props> {
  componentDidMount() {
    this.props.revisions.fetchPage({ id: this.props.document.id });
  }

  render() {
    const revisions = this.props.revisions.getDocumentRevisions(
      this.props.document.id
    );

    return (
      <Wrapper column>
        {revisions.map(revision => (
          <Revision
            key={revision.id}
            revision={revision}
            document={this.props.document}
          />
        ))}
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

export default inject('documents', 'revisions')(DocumentHistory);
