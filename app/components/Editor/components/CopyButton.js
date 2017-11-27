// @flow
import React, { Component } from 'react';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import { color } from 'shared/styles/constants';
import styled from 'styled-components';
import CopyToClipboard from 'components/CopyToClipboard';

@observer
class CopyButton extends Component {
  @observable copied: boolean = false;
  copiedTimeout: ?number;

  componentWillUnmount() {
    clearTimeout(this.copiedTimeout);
  }

  handleCopy = () => {
    this.copied = true;
    this.copiedTimeout = setTimeout(() => (this.copied = false), 3000);
  };

  render() {
    return (
      <StyledCopyToClipboard onCopy={this.handleCopy} {...this.props}>
        <span>{this.copied ? 'Copied!' : 'Copy to clipboard'}</span>
      </StyledCopyToClipboard>
    );
  }
}

const StyledCopyToClipboard = styled(CopyToClipboard)`
  position: absolute;
  top: 0;
  right: 0;

  opacity: 0;
  transition: opacity 50ms ease-in-out;
  z-index: 1;
  font-size: 12px;
  background: ${color.slateLight};
  border-radius: 0 2px 0 2px;
  padding: 1px 6px;
  cursor: pointer;

  &:hover {
    background: ${color.slate};
  }
`;

export default CopyButton;
