import * as React from "react";
import styled from "styled-components";
import { randomInteger } from "@shared/random";
import Flex from "~/components/Flex";
import { pulsate } from "~/styles/animations";

export type Props = {
  header?: boolean;
  height?: number;
  minWidth?: number;
  maxWidth?: number;
  delay?: number;
};

class PlaceholderText extends React.Component<Props> {
  width = randomInteger(this.props.minWidth || 75, this.props.maxWidth || 100);

  shouldComponentUpdate() {
    return false;
  }

  render() {
    return (
      <Mask
        width={this.width}
        height={this.props.height}
        delay={this.props.delay}
        header={this.props.header}
      />
    );
  }
}

const Mask = styled(Flex)<{
  width: number;
  height?: number;
  delay?: number;
  header?: boolean;
}>`
  width: ${(props) => (props.header ? props.width / 2 : props.width)}%;
  height: ${(props) =>
    props.height ? props.height : props.header ? 24 : 18}px;
  margin-bottom: 6px;
  border-radius: 6px;
  background-color: ${(props) => props.theme.divider};
  animation: ${pulsate} 2s infinite;
  animation-delay: ${(props) => props.delay || 0}s;

  &:last-child {
    margin-bottom: 0;
  }
`;

export default PlaceholderText;
