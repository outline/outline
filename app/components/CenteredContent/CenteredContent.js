// @flow
import React from 'react';
import styled from 'styled-components';
import breakpoint from 'styled-components-breakpoint';

type Props = {
  children?: React.Element<any>,
};

const Container = styled.div`
  width: 100%;
  padding: 60px;

  ${breakpoint('mobile')`
    padding-left: 16px;
    padding-right: 16px;
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
