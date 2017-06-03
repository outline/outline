// @flow
import React, { Component } from 'react';
import Popover from 'boundless-popover';
import styled from 'styled-components';
import { Flex } from 'reflexbox';

const Container = styled(Flex)`
  color: #ccc;
  font-size: 13px;
  user-select: none;
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
  }

  > div {
    outline: none;
    background: #FFF;
    box-shadow: 0 2px 3px rgba(0,0,0,.1);
    border-radius: 2px;
    line-height: 1.5;
    padding: 1.5rem;
    min-width: 300px;
    min-height: 300px;
  }
`;

class DocumentViews extends Component {
  anchor: HTMLElement;
  props: {
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
            TEST
          </StyledPopover>}
      </Container>
    );
  }
}

export default DocumentViews;
