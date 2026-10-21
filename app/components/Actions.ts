import styled from "styled-components";
import { breakpoint } from "@shared/styles/breakpoint";
import { MOBILE_TOUCH_TARGET } from "@shared/constants";
import { s } from "@shared/styles";
import Flex from "~/components/Flex";

export const Action = styled(Flex)`
  justify-content: center;
  align-items: center;
  height: 32px;
  font-size: 15px;
  flex-shrink: 0;

  ${breakpoint("mobile", "tablet")`
    height: ${MOBILE_TOUCH_TARGET}px;
  `};

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
  gap: 8px;

  @media print {
    display: none;
  }

  ${breakpoint("tablet")`
    left: auto;
    padding: 24px;
  `};
`;

export default Actions;
