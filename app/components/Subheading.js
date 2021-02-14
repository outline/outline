// @flow
import * as React from "react";
import styled from "styled-components";

type Props = {|
  children: React.Node,
|};

const H3 = styled.h3`
  border-bottom: 1px solid ${(props) => props.theme.divider};
  margin: 12px 0;
  line-height: 1;
`;

const Underline = styled.div`
  margin-top: -1px;
  display: inline-block;
  font-weight: 500;
  font-size: 14px;
  line-height: 1.5;
  color: ${(props) => props.theme.textSecondary};
  border-bottom: 3px solid ${(props) => props.theme.textSecondary};
  padding-top: 7px;
  padding-bottom: 5px;
`;

// When sticky we need extra background coverage around the sides otherwise
// items that scroll past can "stick out" the sides of the heading
const Sticky = styled.div`
  position: sticky;
  top: 54px;
  margin: 0 -8px;
  padding: 0 8px;
  background: ${(props) => props.theme.background};
  transition: ${(props) => props.theme.backgroundTransition};
  z-index: ${(props) => props.theme.depths.stickyHeader};
`;

const Subheading = ({ children, ...rest }: Props) => {
  return (
    <Sticky>
      <H3 {...rest}>
        <Underline>{children}</Underline>
      </H3>
    </Sticky>
  );
};

export default Subheading;
