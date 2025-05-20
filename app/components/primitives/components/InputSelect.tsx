/**
 * Reusable components for InputSelect abstraction.
 */

import { CheckmarkIcon } from "outline-icons";
import { forwardRef } from "react";
import styled, { css } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { s } from "@shared/styles";
import Button, { Inner } from "~/components/Button";
import Flex from "~/components/Flex";

export const SelectItem = forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>((props, ref) => {
  const { children, ...rest } = props;

  return (
    <ItemContainer
      ref={ref}
      justify="space-between"
      align="center"
      gap={8}
      {...rest}
    >
      {children}
      <IconSpacer />
    </ItemContainer>
  );
});
SelectItem.displayName = "SelectItem";

export const SelectItemIndicator = forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<"span">
>((props, ref) => (
  <IndicatorContainer ref={ref} {...props}>
    <CheckmarkIcon />
  </IndicatorContainer>
));
SelectItemIndicator.displayName = "SelectItemIndicator";

const IconSpacer = styled.div`
  width: 24px;
  height: 24px;
  flex-shrink: 0;
`;

export const SelectButton = styled(Button)<{ $nude?: boolean }>`
  display: block;
  font-weight: normal;
  text-transform: none;
  width: 100%;
  cursor: var(--pointer);

  &:hover:not(:disabled) {
    background: ${s("buttonNeutralBackground")};
  }

  &:focus-visible {
    outline: none;
  }

  ${(props) =>
    props.$nude &&
    css`
      border-color: transparent;
      box-shadow: none;
    `}

  ${Inner} {
    line-height: 28px;
    padding-left: 12px;
    padding-right: 4px;
  }

  svg {
    justify-self: flex-end;
    margin-left: auto;
  }

  &[data-placeholder=""] {
    color: ${s("placeholder")};
  }
`;

const ItemContainer = styled(Flex)`
  position: relative;
  width: 100%;
  font-size: 16px;
  cursor: var(--pointer);
  color: ${s("textSecondary")};
  background: none;
  margin: 0;
  padding: 12px;
  border: 0;
  border-radius: 4px;
  outline: 0;
  user-select: none;
  white-space: nowrap;

  svg {
    flex-shrink: 0;
  }

  @media (hover: hover) {
    &:hover,
    &:focus {
      color: ${s("accentText")};
      background: ${s("accent")};

      svg {
        color: ${s("accentText")};
        fill: ${s("accentText")};
      }
    }
  }

  &[data-state="checked"] {
    ${IconSpacer} {
      display: none;
    }
  }

  ${breakpoint("tablet")`
    font-size: 14px;
    padding: 4px;
    padding-left: 8px;
  `}
`;

const IndicatorContainer = styled.span`
  width: 24px;
  height: 24px;
`;
