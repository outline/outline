// @flow
import * as React from 'react';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import styled from 'styled-components';
import { CloseIcon } from 'outline-icons';
import Tooltip from './Tooltip';
import Flex from 'shared/components/Flex';

type Props = {
  id: string,
  children: React.Node,
  disabled?: boolean,
};

@observer
class Tip extends React.Component<Props> {
  @observable
  isHidden: boolean = window.localStorage.getItem(this.storageId) === 'hidden';

  get storageId() {
    return `tip-${this.props.id}`;
  }

  hide = () => {
    window.localStorage.setItem(this.storageId, 'hidden');
    this.isHidden = true;
  };

  render() {
    const { children } = this.props;
    if (this.props.disabled || this.isHidden) return null;

    return (
      <Wrapper align="flex-start">
        <span>{children}</span>

        <Tooltip tooltip="Hide this message" placement="bottom">
          <Close type="close" size={32} color="#000" onClick={this.hide} />
        </Tooltip>
      </Wrapper>
    );
  }
}

const Close = styled(CloseIcon)`
  margin-top: 8px;
`;

const Wrapper = styled(Flex)`
  background: ${props => props.theme.primary};
  color: ${props => props.theme.text};
  padding: 8px 16px;
  border-radius: 4px;
  font-weight: 400;
`;

export default Tip;
