import * as React from "react";
import styled from "styled-components";
import DelayedMount from "~/components/DelayedMount";
import PlaceholderText from "~/components/PlaceholderText";

function PlaceholderCollections(props: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <DelayedMount>
      <Wrapper {...props}>
        <PlaceholderText />
        <PlaceholderText delay={0.2} />
        <PlaceholderText delay={0.4} />
      </Wrapper>
    </DelayedMount>
  );
}

const Wrapper = styled.div`
  margin: 4px 12px;
  width: 75%;
`;

export default PlaceholderCollections;
