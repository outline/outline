import styled from "styled-components";
import { breakpoints, s, hover } from "@shared/styles";
import NudeButton from "~/components/NudeButton";

export const IconButton = styled(NudeButton)<{ delay?: number }>`
  width: 32px;
  height: 32px;
  padding: 4px;

  &: ${hover} {
    background: ${s("listItemHoverBackground")};
  }

  &[aria-current="true"] {
    background: ${s("listItemHoverBackground")};
    box-shadow: inset 0 0 0 1px ${s("inputBorderFocused")};
  }

  @media (max-width: ${breakpoints.tablet - 1}px) {
    width: 40px;
    height: 40px;
  }
`;
