import * as React from "react";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";

type Props = {
  children?: React.ReactNode;
  maxWidth?: string;
  withStickyHeader?: boolean;
  shrink?: boolean;
};

const Container = styled.div<Props>`
  width: 100%;
  max-width: 100vw;
  padding: ${(props) => (props.withStickyHeader ? "4px 12px" : "60px 12px")};

  ${breakpoint("tablet")`
    padding: ${(props: Props) =>
      props.shrink
        ? "4px 44px"
        : props.withStickyHeader
        ? "4px 44px 60px"
        : "60px 44px"};
  `};
`;

type ContentProps = { $maxWidth?: string };

const Content = styled.div<ContentProps>`
  max-width: ${(props) => props.$maxWidth ?? "46em"};
  margin: 0 auto;

  ${breakpoint("desktopLarge")`
    max-width: ${(props: ContentProps) => props.$maxWidth ?? "52em"};
  `};
`;

const CenteredContent: React.FC<Props> = ({
  children,
  maxWidth,
  ...rest
}: Props) => (
  <Container {...rest}>
    <Content $maxWidth={maxWidth}>{children}</Content>
  </Container>
);

export default CenteredContent;
