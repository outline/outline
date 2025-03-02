/**
 * Reusable components for InputSelect abstraction.
 */

import { CheckmarkIcon } from "outline-icons";
import React from "react";
import styled, { css } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { s } from "@shared/styles";
import Button, { Inner } from "~/components/Button";
import Flex from "~/components/Flex";

interface SelectItemProps extends React.ComponentPropsWithoutRef<"div"> {
  reverse: boolean;
}

export const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  (props, ref) => {
    const { reverse, children, ...rest } = props;

    return (
      <ItemContainer
        ref={ref}
        justify="space-between"
        align="center"
        gap={8}
        reverse={reverse}
        {...rest}
      >
        {children}
        <IconSpacer />
      </ItemContainer>
    );
  }
);
SelectItem.displayName = "SelectItem";

export const SelectItemIndicator = React.forwardRef<
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

type ItemContainerProps = { reverse: boolean };

const ItemContainer = styled(Flex)<ItemContainerProps>`
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
    ${({ reverse }: ItemContainerProps) =>
      reverse ? "padding-right: 8px;" : "padding-left: 8px;"}
  `}
`;

const IndicatorContainer = styled.span`
  width: 24px;
  height: 24px;
`;
