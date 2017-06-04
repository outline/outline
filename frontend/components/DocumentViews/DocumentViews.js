// @flow
import React, { Component } from 'react';
import { observer } from 'mobx-react';
import Popover from 'components/Popover';
import styled from 'styled-components';
import DocumentViewers from './components/DocumentViewers';
import DocumentViewersStore from './DocumentViewersStore';
import { Flex } from 'reflexbox';

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

@observer class DocumentViews extends Component {
  anchor: HTMLElement;
  store: DocumentViewersStore;
  props: Props;
  state: {
    opened: boolean,
  };
  state = {};

  constructor(props: Props) {
    super(props);
    this.store = new DocumentViewersStore(props.documentId);
  }

  openPopover = () => {
    this.setState({ opened: true });
  };

  closePopover = () => {
    this.setState({ opened: false });
  };

  setRef = (ref: HTMLElement) => {
    this.anchor = ref;
  };

  render() {
    return (
      <Container align="center">
        <a ref={this.setRef} onClick={this.openPopover}>
          Viewed
          {' '}
          {this.props.count}
          {' '}
          {this.props.count === 1 ? 'time' : 'times'}
        </a>
        {this.state.opened &&
          <Popover anchor={this.anchor} onClose={this.closePopover}>
            <DocumentViewers
              onMount={this.store.fetchViewers}
              viewers={this.store.viewers}
            />
          </Popover>}
      </Container>
    );
  }
}

export default DocumentViews;
