// @flow
import React from 'react';
import styled from 'styled-components';
import { color } from 'styles/constants';

export type Props = {
  className?: string,
  type?: string,
  light?: boolean,
  black?: boolean,
  primary?: boolean,
  color?: string,
};

type BaseProps = {
  children?: React$Element<any>,
};

export default function Icon({
  children,
  light,
  black,
  primary,
  color,
  type,
  ...rest
}: Props & BaseProps) {
  return (
    <Wrapper light={light} black={black} primary={primary} {...rest}>
      {children}
    </Wrapper>
  );
}

const Wrapper = styled.span`
  svg {
    fill: ${props => {
            if (props.color) return props.color;
            if (props.light) return color.white;
            if (props.black) return color.black;
            if (props.primary) return color.primary;
            return color.slateDark;
          }};
  }
`;
