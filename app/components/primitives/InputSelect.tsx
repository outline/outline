import * as InputSelectPrimitive from "@radix-ui/react-select";
import React from "react";
import styled from "styled-components";
import { depths, s } from "@shared/styles";
import { Props as ButtonProps } from "~/components/Button";
import Separator from "~/components/ContextMenu/Separator";
import { fadeAndSlideDown, fadeAndSlideUp } from "~/styles/animations";
import {
  SelectItemIndicator,
  SelectItem as SelectItemWrapper,
  SelectButton,
} from "./components/InputSelect";

/* ----------------------------------------------------------------------------
 * Root
 * --------------------------------------------------------------------------*/

const InputSelectRoot = InputSelectPrimitive.Root;

/* ----------------------------------------------------------------------------
 * Trigger
 * --------------------------------------------------------------------------*/

export type TriggerButtonProps = {
  nude?: boolean;
  className?: string;
} & Pick<ButtonProps<unknown>, "borderOnHover">;

type InputSelectTriggerProps = { placeholder: string } & TriggerButtonProps &
  React.ComponentPropsWithoutRef<typeof InputSelectPrimitive.Trigger>;

const InputSelectTrigger = React.forwardRef<
  React.ElementRef<typeof InputSelectPrimitive.Trigger>,
  InputSelectTriggerProps
>((props, ref) => {
  const { placeholder, children, ...buttonProps } = props;

  return (
    <InputSelectPrimitive.Trigger ref={ref} asChild>
      <SelectButton neutral disclosure {...buttonProps}>
        <InputSelectPrimitive.Value placeholder={placeholder} />
      </SelectButton>
    </InputSelectPrimitive.Trigger>
  );
});
InputSelectTrigger.displayName = InputSelectPrimitive.Trigger.displayName;

/* ----------------------------------------------------------------------------
 * Content
 * --------------------------------------------------------------------------*/

type ContentProps = Omit<
  React.ComponentPropsWithoutRef<typeof InputSelectPrimitive.Content>,
  "position"
>;

const InputSelectContent = React.forwardRef<
  React.ElementRef<typeof InputSelectPrimitive.Content>,
  ContentProps
>((props, ref) => {
  const { children, ...rest } = props;

  return (
    <InputSelectPrimitive.Portal>
      <StyledContent ref={ref} position={"popper"} {...rest}>
        <InputSelectPrimitive.Viewport style={{ overscrollBehavior: "none" }}>
          {children}
        </InputSelectPrimitive.Viewport>
      </StyledContent>
    </InputSelectPrimitive.Portal>
  );
});
InputSelectContent.displayName = InputSelectPrimitive.Content.displayName;

/* ----------------------------------------------------------------------------
 * Item
 * --------------------------------------------------------------------------*/

const InputSelectItem = React.forwardRef<
  React.ElementRef<typeof InputSelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof InputSelectPrimitive.Item>
>((props, ref) => {
  const { children, ...rest } = props;

  return (
    <InputSelectPrimitive.Item ref={ref} {...rest} asChild>
      <SelectItemWrapper>
        <InputSelectPrimitive.ItemText>
          {children}
        </InputSelectPrimitive.ItemText>
        <InputSelectPrimitive.ItemIndicator asChild>
          <SelectItemIndicator />
        </InputSelectPrimitive.ItemIndicator>
      </SelectItemWrapper>
    </InputSelectPrimitive.Item>
  );
});
InputSelectItem.displayName = InputSelectPrimitive.Item.displayName;

/* ----------------------------------------------------------------------------
 * Separator
 * --------------------------------------------------------------------------*/

const InputSelectSeparator = React.forwardRef<
  React.ElementRef<typeof InputSelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof InputSelectPrimitive.Separator>
>((props, ref) => (
  <InputSelectPrimitive.Separator ref={ref} asChild>
    <Separator {...props} />
  </InputSelectPrimitive.Separator>
));
InputSelectSeparator.displayName = InputSelectPrimitive.Separator.displayName;

/* ----------------------------------------------------------------------------
 * Styled components
 * --------------------------------------------------------------------------*/

const StyledContent = styled(InputSelectPrimitive.Content)`
  z-index: ${depths.menu};
  min-width: var(--radix-select-trigger-width);
  max-width: 400px;
  min-height: 44px;
  max-height: 350px;

  padding: 4px;
  border-radius: 6px;
  background: ${s("menuBackground")};
  box-shadow: ${s("menuShadow")};
  transform-origin: 50% 0;

  &[data-side="bottom"] {
    animation: ${fadeAndSlideDown} 200ms ease;
  }

  &[data-side="top"] {
    animation: ${fadeAndSlideUp} 200ms ease;
  }

  @media print {
    display: none;
  }
`;

export {
  InputSelectRoot,
  InputSelectTrigger,
  InputSelectContent,
  InputSelectItem,
  InputSelectSeparator,
};
