import * as SelectPrimitive from "@radix-ui/react-select";
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

const Select = SelectPrimitive.Root;

/* ----------------------------------------------------------------------------
 * Trigger
 * --------------------------------------------------------------------------*/

export type TriggerButtonProps = {
  nude?: boolean;
  className?: string;
} & Pick<ButtonProps<unknown>, "borderOnHover">;

type SelectTriggerProps = { placeholder: string } & TriggerButtonProps &
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  SelectTriggerProps
>((props, ref) => {
  const { placeholder, children, ...buttonProps } = props;

  return (
    <SelectPrimitive.Trigger ref={ref} asChild>
      <SelectButton neutral disclosure {...buttonProps}>
        <SelectPrimitive.Value placeholder={placeholder} />
      </SelectButton>
    </SelectPrimitive.Trigger>
  );
});
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

/* ----------------------------------------------------------------------------
 * Content
 * --------------------------------------------------------------------------*/

type ContentProps = Omit<
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>,
  "position"
>;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  ContentProps
>((props, ref) => {
  const { children, ...rest } = props;

  return (
    <SelectPrimitive.Portal>
      <StyledContent
        ref={ref}
        position={"popper"}
        avoidCollisions={false}
        {...rest}
      >
        <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
      </StyledContent>
    </SelectPrimitive.Portal>
  );
});
SelectContent.displayName = SelectPrimitive.Content.displayName;

/* ----------------------------------------------------------------------------
 * Item
 * --------------------------------------------------------------------------*/

interface SelectItemProps
  extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item> {
  reverse: boolean;
}

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  SelectItemProps
>((props, ref) => {
  const { reverse, children, ...rest } = props;

  return (
    <SelectPrimitive.Item ref={ref} {...rest} asChild>
      <SelectItemWrapper reverse={reverse}>
        <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
        <SelectPrimitive.ItemIndicator asChild>
          <SelectItemIndicator />
        </SelectPrimitive.ItemIndicator>
      </SelectItemWrapper>
    </SelectPrimitive.Item>
  );
});
SelectItem.displayName = SelectPrimitive.Item.displayName;

/* ----------------------------------------------------------------------------
 * Separator
 * --------------------------------------------------------------------------*/

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>((props, ref) => (
  <SelectPrimitive.Separator ref={ref} asChild>
    <Separator {...props} />
  </SelectPrimitive.Separator>
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

/* ----------------------------------------------------------------------------
 * Styled components
 * --------------------------------------------------------------------------*/

const StyledContent = styled(SelectPrimitive.Content)`
  z-index: ${depths.menu};
  min-width: var(--radix-select-trigger-width);
  max-width: 400px;
  min-height: 44px;
  max-height: var(--radix-select-content-available-height);

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

export { Select, SelectTrigger, SelectContent, SelectItem, SelectSeparator };
