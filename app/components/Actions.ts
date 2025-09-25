import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { s } from "@shared/styles";
import Flex from "~/components/Flex";

export const Action = styled(Flex)`
  justify-content: center;
  align-items: center;
  height: 32px;
  font-size: 15px;
  flex-shrink: 0;

  &:empty {
    display: none;
  }
`;

export const Separator = styled.div`
  flex-shrink: 0;
  width: 1px;
  height: 28px;
  background: ${s("divider")};
`;

const Actions = styled(Flex)`
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  border-radius: 3px;
  background: ${s("background")};
  padding: 12px;
  backdrop-filter: blur(20px);
  gap: 12px;

  @media print {
    display: none;
  }

  ${breakpoint("tablet")`
    left: auto;
    padding: 24px;
  `};
`;

export default Actions;
