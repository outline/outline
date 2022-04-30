import * as React from "react";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";

type Props = {
  withStickyHeader?: boolean;
};

const Container = styled.div<Props>`
  width: 100%;
  max-width: 100vw;
  padding: ${(props) => (props.withStickyHeader ? "4px 12px" : "60px 12px")};

  ${breakpoint("tablet")`
    padding: ${(props: Props) =>
      props.withStickyHeader ? "4px 44px 60px" : "60px 44px"};
  `};
`;

const Content = styled.div`
  max-width: 46em;
  margin: 0 auto;

  ${breakpoint("desktopLarge")`
    max-width: 52em;
  `};
`;

const CenteredContent: React.FC<Props> = ({ children, ...rest }) => {
  return (
    <Container {...rest}>
      <Content>{children}</Content>
    </Container>
  );
};

export default CenteredContent;
