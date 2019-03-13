// @flow
import * as React from 'react';
import styled from 'styled-components';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
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
    const { src, ...rest } = this.props;

    return (
      <CircleImg
        onError={this.handleError}
        src={this.error ? placeholder : src}
        {...rest}
      />
    );
  }
}

const CircleImg = styled.img`
  width: ${props => props.size}px;
  height: ${props => props.size}px;
  border-radius: 50%;
  border: 2px solid ${props => props.theme.background};
  flex-shrink: 0;
`;

export default Avatar;
