// @flow
import * as React from "react";
import styled from "styled-components";

type Props = {
  children: React.Node,
};

const H3 = styled.h3`
  border-bottom: 1px solid ${(props) => props.theme.divider};
  margin-top: 22px;
  margin-bottom: 12px;
  line-height: 1;
  position: relative;
`;

const Underline = styled("span")`
  margin-top: -1px;
  display: inline-block;
  font-weight: 500;
  font-size: 14px;
  line-height: 1.5;
  color: ${(props) => props.theme.textSecondary};
  border-bottom: 3px solid ${(props) => props.theme.textSecondary};
  padding-bottom: 5px;
`;

const Subheading = ({ children, ...rest }: Props) => {
  return (
    <H3 {...rest}>
      <Underline>{children}</Underline>
    </H3>
  );
};

export default Subheading;
