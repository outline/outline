// @flow
import * as React from "react";
import styled from "styled-components";
import DelayedMount from "components/DelayedMount";
import Fade from "components/Fade";
import Flex from "components/Flex";
import Mask from "components/Mask";

export default function LoadingPlaceholder(props: Object) {
  return (
    <DelayedMount>
      <Wrapper>
        <Flex column auto {...props}>
          <Mask height={34} />
          <br />
          <Mask />
          <Mask />
          <Mask />
        </Flex>
      </Wrapper>
    </DelayedMount>
  );
}

const Wrapper = styled(Fade)`
  display: block;
  margin: 40px 0;
`;
