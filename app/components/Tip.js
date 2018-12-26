// @flow
import * as React from 'react';
import styled from 'styled-components';
import { CloseIcon } from 'outline-icons';
import Button from './Button';
import Tooltip from './Tooltip';
import Flex from 'shared/components/Flex';

type Props = {
  id: string,
  children: React.Node,
  disabled?: boolean,
};

type State = {
  isHidden: boolean,
};

class Tip extends React.Component<Props, State> {
  state = {
    isHidden: window.localStorage.getItem(this.storageId) === 'hidden',
  };

  get storageId() {
    return `tip-${this.props.id}`;
  }

  hide = () => {
    window.localStorage.setItem(this.storageId, 'hidden');
    this.setState({ isHidden: true });
  };

  render() {
    const { children } = this.props;
    if (this.props.disabled || this.state.isHidden) return null;

    return (
      <Wrapper align="center">
        <span>{children}</span>

        <Tooltip tooltip="Hide this message" placement="bottom">
          <Button
            onClick={this.hide}
            icon={<CloseIcon type="close" size={32} color="#FFF" />}
          />
        </Tooltip>
      </Wrapper>
    );
  }
}

const Wrapper = styled(Flex)`
  background: ${props => props.theme.primary};
  color: ${props => props.theme.text};
  padding: 8px 16px;
  border-radius: 4px;
  font-weight: 400;
`;

export default Tip;
