// @flow
import * as React from 'react';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import Popover from 'components/Popover';
import styled from 'styled-components';
import DocumentViewers from './components/DocumentViewers';
import DocumentViewersStore from './DocumentViewersStore';
import Flex from 'shared/components/Flex';

const Container = styled(Flex)`
  font-size: 13px;
  user-select: none;

  a {
    color: #ccc;

    &:hover {
      color: #aaa;
    }
  }
`;

type Props = {
  documentId: string,
  count: number,
};

@observer
class DocumentViews extends React.Component<Props> {
  @observable opened: boolean = false;
  anchor: ?HTMLElement;
  store: DocumentViewersStore;

  constructor(props: Props) {
    super(props);
    this.store = new DocumentViewersStore(props.documentId);
  }

  openPopover = () => {
    this.opened = true;
  };

  closePopover = () => {
    this.opened = false;
  };

  setRef = (ref: ?HTMLElement) => {
    this.anchor = ref;
  };

  render() {
    return (
      <Container align="center">
        <a ref={this.setRef} onClick={this.openPopover}>
          Viewed {this.props.count} {this.props.count === 1 ? 'time' : 'times'}
        </a>
        {this.opened && (
          <Popover anchor={this.anchor} onClose={this.closePopover}>
            <DocumentViewers
              onMount={this.store.fetchViewers}
              viewers={this.store.viewers}
            />
          </Popover>
        )}
      </Container>
    );
  }
}

export default DocumentViews;
