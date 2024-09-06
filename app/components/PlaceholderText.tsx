import * as React from "react";
import styled from "styled-components";
import { randomInteger } from "@shared/random";
import { s } from "@shared/styles";
import Flex from "~/components/Flex";
import { pulsate } from "~/styles/animations";

export type Props = React.ComponentProps<typeof Flex> & {
  header?: boolean;
  width?: number;
  height?: number;
  minWidth?: number;
  maxWidth?: number;
  delay?: number;
};

function PlaceholderText({ minWidth, maxWidth, ...restProps }: Props) {
  // We only want to compute the width once so we are storing it inside ref
  const widthRef = React.useRef(randomInteger(minWidth || 75, maxWidth || 100));

  return (
    <Mask
      width={`${widthRef.current / (restProps.header ? 2 : 1)}%`}
      {...restProps}
    />
  );
}

const Mask = styled(Flex)<{
  width: number | string;
  height?: number;
  delay?: number;
  header?: boolean;
}>`
  width: ${(props) =>
    typeof props.width === "number" ? `${props.width}px` : props.width};
  height: ${(props) =>
    props.height ? props.height : props.header ? 24 : 18}px;
  margin-bottom: 6px;
  border-radius: 6px;
  background-color: ${s("divider")};
  animation: ${pulsate} 2s infinite;
  animation-delay: ${(props) => props.delay || 0}s;

  &:last-child {
    margin-bottom: 0;
  }
`;

// We don't want the component to re-render on any props change
// So returning true from the custom comparison function to avoid re-render
export default React.memo(PlaceholderText, () => true);
