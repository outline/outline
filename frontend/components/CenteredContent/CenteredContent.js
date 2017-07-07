// @flow
import React from 'react';
import styled from 'styled-components';

type Props = {
  children?: React.Element<any>,
};

const Container = styled.div`
  width: 100%;
  margin: 40px 20px;
`;

const Content = styled.div`
  max-width: 740px;
  margin: 0 auto;
`;

const CenteredContent = ({ children, ...rest }: Props) => {
  return (
    <Container {...rest}>
      <Content>
        {children}
      </Content>
    </Container>
  );
};

export default CenteredContent;
