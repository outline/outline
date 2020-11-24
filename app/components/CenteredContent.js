// @flow
import * as React from "react";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";

type Props = {
  children?: React.Node,
};

const Container = styled.div`
  width: 100%;
  max-width: 100vw;
  padding: 60px 20px;

  ${breakpoint("tablet")`
    padding: 60px;
  `};
`;

const Content = styled.div`
  max-width: 46em;
  margin: 0 auto;
`;

const CenteredContent = ({ children, ...rest }: Props) => {
  return (
    <Container {...rest}>
      <Content>{children}</Content>
    </Container>
  );
};

export default CenteredContent;
