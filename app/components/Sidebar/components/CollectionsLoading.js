// @flow
import * as React from "react";
import styled from "styled-components";
import Mask from "components/Mask";

function CollectionsLoading() {
  return (
    <Wrapper>
      <Mask />
      <Mask delay={0.2} />
      <Mask delay={0.4} />
    </Wrapper>
  );
}

const Wrapper = styled.div`
  margin: 4px 16px;
  width: 75%;
`;

export default CollectionsLoading;
