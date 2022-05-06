import * as React from "react";
import styled from "styled-components";
import Flex from "~/components/Flex";

const FadeOut = styled(Flex)<{ $fade: boolean }>`
  opacity: ${(props) => (props.$fade ? 0 : 1)};
  visibility: ${(props) => (props.$fade ? "hidden" : "visible")};
  transition: opacity 900ms ease-in-out, visibility ease-in-out 900ms;
`;

export default React.memo(FadeOut);
