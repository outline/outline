import * as React from "react";
import styled from "styled-components";
import { s } from "@shared/styles";

type Props = {
  children?: React.ReactNode;
  sticky?: boolean;
};

const H3 = styled.h3`
  border-bottom: 1px solid ${s("divider")};
  margin: 12px 0;
  line-height: 1;
`;

const Underline = styled.div`
  display: inline-block;
  font-weight: 500;
  font-size: 14px;
  line-height: 1.5;
  color: ${s("textSecondary")};
  padding-top: 6px;
  padding-bottom: 6px;
`;

// When sticky we need extra background coverage around the sides otherwise
// items that scroll past can "stick out" the sides of the heading
const Background = styled.div<{ sticky?: boolean }>`
  position: ${(props) => (props.sticky ? "sticky" : "relative")};
  ${(props) => (props.sticky ? "top: 54px;" : "")}
  margin: 0 -8px;
  padding: 0 8px;
  background: ${s("background")};
  z-index: 1;
`;

const Subheading: React.FC<Props> = ({ children, sticky, ...rest }: Props) => (
  <Background sticky={sticky}>
    <H3 {...rest}>
      <Underline>{children}</Underline>
    </H3>
  </Background>
);

export default Subheading;
