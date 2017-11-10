// @flow
import React from 'react';
import { observer } from 'mobx-react';
import Flex from 'shared/components/Flex';
import styled from 'styled-components';
import { color } from 'shared/styles/constants';

type Props = {
  children: React.Element<*>,
  type?: 'info' | 'success' | 'warning' | 'danger' | 'offline',
};

@observer
class Alert extends React.Component {
  props: Props;
  defaultProps = {
    type: 'info',
  };

  render() {
    return (
      <Container align="center" justify="center" type={this.props.type}>
        {this.props.children}
      </Container>
    );
  }
}

const Container = styled(Flex)`
  height: $headerHeight;
  color: #ffffff;
  font-size: 14px;
  line-height: 1;

  background-color: ${({ type }) => color[type]};
`;

export default Alert;
