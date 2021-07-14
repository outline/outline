// @flow
import * as React from "react";
import styled from "styled-components";
import DelayedMount from "components/DelayedMount";
import Fade from "components/Fade";
import Flex from "components/Flex";
import PlaceholderText from "components/PlaceholderText";

export default function PlaceholderDocument(props: Object) {
  return (
    <DelayedMount>
      <Wrapper>
        <Flex column auto {...props}>
          <PlaceholderText height={34} maxWidth={70} />
          <PlaceholderText delay={0.2} maxWidth={40} />
          <br />
          <PlaceholderText delay={0.2} />
          <PlaceholderText delay={0.4} />
          <PlaceholderText delay={0.6} />
        </Flex>
      </Wrapper>
    </DelayedMount>
  );
}

const Wrapper = styled(Fade)`
  display: block;
  margin: 40px 0;
`;
