import { LocationDescriptor } from "history";
import { DisclosureIcon } from "outline-icons";
import { darken, lighten, transparentize } from "polished";
import * as React from "react";
import styled from "styled-components";
import { s } from "@shared/styles";
import ActionButton, {
  Props as ActionButtonProps,
} from "~/components/ActionButton";
import { undraggableOnDesktop } from "~/styles";

type RealProps = {
  $fullwidth?: boolean;
  $borderOnHover?: boolean;
  $neutral?: boolean;
  $danger?: boolean;
};

const RealButton = styled(ActionButton)<RealProps>`
  display: ${(props) => (props.$fullwidth ? "block" : "inline-block")};
  width: ${(props) => (props.$fullwidth ? "100%" : "auto")};
  margin: 0;
  padding: 0;
  border: 0;
  background: ${s("accent")};
  color: ${s("accentText")};
  box-shadow: rgba(0, 0, 0, 0.2) 0px 1px 2px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  height: 32px;
  text-decoration: none;
  flex-shrink: 0;
  cursor: var(--pointer);
  user-select: none;
  appearance: none !important;
  ${undraggableOnDesktop()}

  &::-moz-focus-inner {
    padding: 0;
    border: 0;
  }

  &:hover:not(:disabled),
  &[aria-expanded="true"] {
    background: ${(props) => darken(0.05, props.theme.accent)};
  }

  &:disabled {
    cursor: default;
    pointer-events: none;
    color: ${(props) => transparentize(0.3, props.theme.accentText)};
    background: ${(props) => transparentize(0.1, props.theme.accent)};

    svg {
      fill: ${(props) => props.theme.white50};
    }
  }

  ${(props) =>
    props.$neutral &&
    `
    background: inherit;
    color: ${props.theme.buttonNeutralText};
    box-shadow: ${
      props.$borderOnHover
        ? "none"
        : `rgba(0, 0, 0, 0.07) 0px 1px 2px, ${props.theme.buttonNeutralBorder} 0 0 0 1px inset`
    };

    &:hover:not(:disabled),
    &[aria-expanded="true"] {
      background: ${
        props.$borderOnHover
          ? props.theme.buttonNeutralBackground
          : darken(0.05, props.theme.buttonNeutralBackground)
      };
      box-shadow: rgba(0, 0, 0, 0.07) 0px 1px 2px, ${
        props.theme.buttonNeutralBorder
      } 0 0 0 1px inset;
    }

    &:disabled {
      color: ${props.theme.textTertiary};
      background: none;

      svg {
        fill: currentColor;
      }
    }
  `}

  ${(props) =>
    props.$danger &&
    `
      background: ${props.theme.danger};
      color: ${props.theme.white};

      &:hover:not(:disabled),
      &[aria-expanded="true"] {
        background: ${darken(0.05, props.theme.danger)};
      }

      &:disabled {
        background: ${lighten(0.05, props.theme.danger)};
      }

      &:focus-visible {
        outline-color: ${darken(0.2, props.theme.danger)} !important;
      }
  `};
`;

const Label = styled.span<{ hasIcon?: boolean }>`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;

  ${(props) => props.hasIcon && "padding-left: 4px;"};
`;

export const Inner = styled.span<{
  disclosure?: boolean;
  hasIcon?: boolean;
  hasText?: boolean;
}>`
  display: flex;
  padding: 0 8px;
  padding-right: ${(props) => (props.disclosure ? 2 : 8)}px;
  line-height: ${(props) => (props.hasIcon ? 24 : 32)}px;
  justify-content: center;
  align-items: center;
  min-height: 32px;

  ${(props) => props.hasIcon && props.hasText && "padding-left: 4px;"};
  ${(props) => props.hasIcon && !props.hasText && "padding: 0 4px;"};
`;

export type Props<T> = ActionButtonProps & {
  icon?: React.ReactNode;
  children?: React.ReactNode;
  disclosure?: boolean;
  neutral?: boolean;
  danger?: boolean;
  fullwidth?: boolean;
  as?: T;
  to?: LocationDescriptor;
  borderOnHover?: boolean;
  hideIcon?: boolean;
  href?: string;
  "data-on"?: string;
  "data-event-category"?: string;
  "data-event-action"?: string;
};

const Button = <T extends React.ElementType = "button">(
  props: Props<T> & React.ComponentPropsWithoutRef<T>,
  ref: React.Ref<HTMLButtonElement>
) => {
  const {
    type,
    children,
    value,
    disclosure,
    neutral,
    action,
    icon,
    borderOnHover,
    hideIcon,
    fullwidth,
    danger,
    ...rest
  } = props;
  const hasText = !!children || value !== undefined;
  const ic = hideIcon ? undefined : action?.icon ?? icon;
  const hasIcon = ic !== undefined;

  return (
    <RealButton
      type={type || "button"}
      ref={ref}
      $neutral={neutral}
      action={action}
      $danger={danger}
      $fullwidth={fullwidth}
      $borderOnHover={borderOnHover}
      {...rest}
    >
      <Inner hasIcon={hasIcon} hasText={hasText} disclosure={disclosure}>
        {hasIcon && ic}
        {hasText && <Label hasIcon={hasIcon}>{children || value}</Label>}
        {disclosure && <StyledDisclosureIcon />}
      </Inner>
    </RealButton>
  );
};

const StyledDisclosureIcon = styled(DisclosureIcon)`
  opacity: 0.8;
`;

export default React.forwardRef(Button);
