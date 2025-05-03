import styled from "styled-components";
import Flex from "@shared/components/Flex";

export const Centered = styled(Flex).attrs({
  align: "center",
  justify: "center",
  column: true,
  auto: true,
})`
  user-select: none;
  width: 90vw;
  height: 100%;
  max-width: 320px;
  margin: 0 auto;
`;
