// @flow
import React from 'react';
import styled from 'styled-components';
import * as Icons from 'react-feather';

export type Props = {
  className?: string,
  type?: string,
  light?: boolean,
};

type BaseProps = {
  children?: React$Element<any>,
};

export default function Icon({
  children,
  light,
  type,
  ...rest
}: Props & BaseProps) {
  if (type) {
    children = React.createElement(Icons[type], {
      size: '1em',
      color: light ? '#FFFFFF' : undefined,
      ...rest,
    });

    return (
      <FeatherWrapper {...rest}>
        {children}
      </FeatherWrapper>
    );
  }

  return (
    <Wrapper light={light} {...rest}>
      {children}
    </Wrapper>
  );
}

const FeatherWrapper = styled.span`
  position: relative;
  top: .1em;
`;

const Wrapper = styled.span`
  svg {
    fill: ${props => (props.light ? '#FFF' : '#000')}
  }
`;
