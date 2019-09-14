// @flow
import * as React from 'react';
import styled from 'styled-components';
import { pulsate } from 'shared/styles/animations';
import { randomInteger } from 'shared/random';
import Flex from 'shared/components/Flex';

type Props = {
  header?: boolean,
  height?: number,
};

class Mask extends React.Component<Props> {
  width: number;

  shouldComponentUpdate() {
    return false;
  }

  componentWillMount() {
    this.width = randomInteger(75, 100);
  }

  render() {
    return <Redacted width={this.width} {...this.props} />;
  }
}

const Redacted = styled(Flex)`
  width: ${props => (props.header ? props.width / 2 : props.width)}%;
  height: ${props => (props.height ? props.height : props.header ? 24 : 18)}px;
  margin-bottom: 6px;
  background-color: ${props => props.theme.divider};
  animation: ${pulsate} 1.3s infinite;

  &:last-child {
    margin-bottom: 0;
  }
`;

export default Mask;
