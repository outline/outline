// @flow
import * as React from 'react';
import styled from 'styled-components';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import { color } from 'shared/styles/constants';
import placeholder from './placeholder.png';

type Props = {
  src: string,
  size: number,
};

@observer
class Avatar extends React.Component<Props> {
  @observable error: boolean;

  static defaultProps = {
    size: 24,
  };

  handleError = () => {
    this.error = true;
  };

  render() {
    return (
      <CircleImg
        size={this.props.size}
        onError={this.handleError}
        src={this.error ? placeholder : this.props.src}
      />
    );
  }
}

const CircleImg = styled.img`
  width: ${props => props.size}px;
  height: ${props => props.size}px;
  border-radius: 50%;
  border: 2px solid ${color.white};
  flex-shrink: 0;
`;

export default Avatar;
