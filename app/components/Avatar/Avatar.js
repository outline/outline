// @flow
import * as React from 'react';
import styled from 'styled-components';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import { color } from 'shared/styles/constants';
import placeholder from './placeholder.png';

@observer
class Avatar extends React.Component<*> {
  @observable error: boolean;

  handleError = () => {
    this.error = true;
  };

  render() {
    return (
      <CircleImg
        {...this.props}
        onError={this.handleError}
        src={this.error ? placeholder : this.props.src}
      />
    );
  }
}

const CircleImg = styled.img`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid ${color.white};
  flex-shrink: 0;
`;

export default Avatar;
