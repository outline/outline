// @flow
import React, { Component } from 'react';
import Popover from 'boundless-popover';
import styled from 'styled-components';
import DocumentViewers from './components/DocumentViewers';
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

const StyledPopover = styled(Popover)`
  display: flex;
  flex-direction: column;

  line-height: 0;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 9999;

  > svg {
    height: 16px;
    width: 16px;
    position: absolute;

    polygon:first-child {
      fill: rgba(0,0,0,.075);
    }
    polygon {
      fill: #FFF;
    }
  }

  > div {
    outline: none;
    background: #FFF;
    box-shadow: 0 0 0 1px rgba(0,0,0,.05), 0 8px 16px rgba(0,0,0,.1), 0 2px 4px rgba(0,0,0,.1);
    border-radius: 4px;
    line-height: 1.5;
    padding: 16px;
    margin-top: 14px;
    min-width: 200px;
    min-height: 150px;
  }
`;

class DocumentViews extends Component {
  anchor: HTMLElement;
  props: {
    documentId: string,
    count: number,
  };
  state: {
    opened: boolean,
  };
  state = {};

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
          <StyledPopover
            anchor={this.anchor}
            preset={Popover.preset.S}
            onClose={this.closePopover}
            closeOnOutsideScroll
            closeOnOutsideFocus
            closeOnEscKey
          >
            <DocumentViewers documentId={this.props.documentId} />
          </StyledPopover>}
      </Container>
    );
  }
}

export default DocumentViews;
