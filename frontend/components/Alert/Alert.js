// @flow
import React from 'react';
import { Flex } from 'reflexbox';
import styled from 'styled-components';
import constants, { color } from 'styles/constants';

type Props = {
  children?: React.Element<any>,
  danger?: boolean,
  warning?: boolean,
  success?: boolean,
};

class Alert extends React.Component {
  props: Props;

  render() {
    let alertType;
    if (this.props.danger) alertType = 'danger';
    if (this.props.warning) alertType = 'warning';
    if (this.props.success) alertType = 'success';
    if (!alertType) alertType = 'info'; // default

    return (
      <Container align="center" justify="center" type={alertType}>
        {this.props.children}
      </Container>
    );
  }
}

const Container = styled(Flex)`
  height: ${constants.headerHeight};
  color: ${color.white};
  font-size: 14px;
  line-height: 1;
  background-color: ${({ type }) => color[type]};
`;

export default Alert;
