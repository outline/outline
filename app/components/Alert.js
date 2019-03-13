// @flow
import * as React from 'react';
import { observer } from 'mobx-react';
import Flex from 'shared/components/Flex';
import styled from 'styled-components';

type Props = {
  children: React.Node,
  type?: 'info' | 'success' | 'warning' | 'danger' | 'offline',
};

@observer
class Alert extends React.Component<Props> {
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
  color: ${props => props.theme.white};
  font-size: 14px;
  line-height: 1;

  background-color: ${({ theme, type }) => theme.color[type]};
`;

export default Alert;
