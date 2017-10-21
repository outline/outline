// @flow
import React from 'react';
import styled from 'styled-components';
import { color } from 'styles/constants';

export type Props = {
  className?: string,
  light?: boolean,
  black?: boolean,
  primary?: boolean,
  color?: string,
  size?: number,
};

type BaseProps = {
  children?: React$Element<*>,
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
    width: ${props => (props.size ? props.size + 'px' : 'auto')};
    height: ${props => (props.size ? props.size + 'px' : 'auto')};

    fill: ${props => {
            if (props.color) return props.color;
            if (props.light) return color.white;
            if (props.black) return color.black;
            if (props.primary) return color.primary;
            return color.slateDark;
          }};
  }
`;
