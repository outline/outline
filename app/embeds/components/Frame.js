// @flow
import * as React from 'react';
import styled from 'styled-components';

type Props = {
  src: string,
  border?: boolean,
};

export default function Frame({ border, ...props }: Props) {
  const Component = border ? Iframe : 'iframe';

  return (
    <Component
      type="text/html"
      frameBorder="0"
      title="embed"
      width="100%"
      height="400"
      allowFullScreen
      {...props}
    />
  );
}

const Iframe = styled.iframe`
  border: 1px solid;
  border-color: #ddd #ddd #ccc;
  border-radius: 3px;
`;
