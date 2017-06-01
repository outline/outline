// @flow
import React from 'react';
import styled from 'styled-components';

type Props = {
  children?: React.Element<any>,
  style?: Object,
  maxWidth?: string,
};

const Container = styled.div`
  width: 100%;
  margin: 40px 20px;
`;

const CenteredContent = ({
  children,
  maxWidth = '740px',
  style,
  ...rest
}: Props) => {
  const styles = {
    maxWidth,
    ...style,
  };

  return (
    <Container style={styles} {...rest}>
      {children}
    </Container>
  );
};

export default CenteredContent;
