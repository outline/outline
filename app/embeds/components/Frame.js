// @flow
import * as React from 'react';
import styled from 'styled-components';

type Props = {
  src?: string,
  border?: boolean,
  innerRef: *,
};

function Frame({ border, innerRef, ...props }: Props) {
  const Component = border ? Iframe : 'iframe';

  return (
    <Component
      ref={innerRef}
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

// $FlowIssue - https://github.com/facebook/flow/issues/6103
export default React.forwardRef((props, ref) => (
  <Frame {...props} innerRef={ref} />
));
