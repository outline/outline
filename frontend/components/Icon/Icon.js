// @flow
import React from 'react';
import styled from 'styled-components';

export type Props = {
  className?: string,
  light?: boolean,
};

type BaseProps = {
  children?: React$Element<any>,
};

export default function Icon({ children, ...rest }: Props & BaseProps) {
  return (
    <Wrapper {...rest}>
      {children}
    </Wrapper>
  );
}

const Wrapper = styled.span`
  svg {
    fill: ${props => (props.light ? '#fff' : '#000')};
  }
`;
