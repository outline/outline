import * as React from "react";
import styled from "styled-components";
import PlaceholderText from "~/components/PlaceholderText";

function PlaceholderCollections() {
  return (
    <Wrapper>
      <PlaceholderText />
      <PlaceholderText delay={0.2} />
      <PlaceholderText delay={0.4} />
    </Wrapper>
  );
}

const Wrapper = styled.div`
  margin: 4px 12px;
  width: 75%;
`;

export default PlaceholderCollections;
