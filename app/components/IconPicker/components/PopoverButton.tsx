import styled, { css } from "styled-components";
import { s, hover } from "@shared/styles";
import NudeButton from "~/components/NudeButton";

export const PopoverButton = styled(NudeButton)<{ $borderOnHover?: boolean }>`
  &: ${hover},
  &:active,
  &[aria-expanded= "true"] {
    opacity: 1 !important;

    ${({ $borderOnHover }) =>
      $borderOnHover &&
      css`
        background: ${s("buttonNeutralBackground")};
        box-shadow: rgba(0, 0, 0, 0.07) 0px 1px 2px,
          ${s("buttonNeutralBorder")} 0 0 0 1px inset;
      `};
  }
`;
