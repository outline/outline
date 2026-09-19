import * as InputSelectPrimitive from "@radix-ui/react-select";
import * as React from "react";
import styled from "styled-components";
import Text from "@shared/components/Text";
import { depths, s, borderRadius } from "@shared/styles";
import type { Props as ButtonProps } from "~/components/Button";
import { fadeAndSlideDown, fadeAndSlideUp } from "~/styles/animations";
import {
  SelectItemIndicator,
  SelectItem as SelectItemWrapper,
  SelectButton,
} from "./components/InputSelect";

/** Root InputSelect component - all the other components are rendered inside it. */
const InputSelectRoot = InputSelectPrimitive.Root;

/** InputSelect's trigger. */

export type TriggerButtonProps = {
  /** When true, "nude" variant of Button is rendered. */
  nude?: boolean;
  /** Optional css class names to pass to the trigger. */
  className?: string;
} & Pick<ButtonProps<unknown>, "borderOnHover">;

type InputSelectTriggerProps = {
  placeholder: string;
  /** When provided, overrides the selected value rendered inside the trigger. */
  displayValue?: React.ReactNode;
  ref?: React.Ref<React.ComponentRef<typeof InputSelectPrimitive.Trigger>>;
} & TriggerButtonProps &
  React.ComponentPropsWithoutRef<typeof InputSelectPrimitive.Trigger>;

function InputSelectTrigger(props: InputSelectTriggerProps) {
  const { ref, placeholder, children, nude, displayValue, ...buttonProps } =
    props;

  return (
    <InputSelectPrimitive.Trigger ref={ref} asChild>
      <SelectButton neutral disclosure $nude={nude} {...buttonProps}>
        {displayValue !== undefined ? (
          <>{displayValue}</>
        ) : (
          <InputSelectPrimitive.Value placeholder={placeholder} />
        )}
      </SelectButton>
    </InputSelectPrimitive.Trigger>
  );
}
InputSelectTrigger.displayName = InputSelectPrimitive.Trigger.displayName;

/** InputSelect's content - renders the options in a scrollable element. */
type ContentProps = Omit<
  React.ComponentPropsWithoutRef<typeof InputSelectPrimitive.Content>,
  "position"
> & {
  ref?: React.Ref<React.ComponentRef<typeof InputSelectPrimitive.Content>>;
};

function InputSelectContent(props: ContentProps) {
  const { ref, children, ...rest } = props;

  return (
    <InputSelectPrimitive.Portal>
      <StyledContent ref={ref} position={"popper"} {...rest}>
        <InputSelectPrimitive.Viewport style={{ overscrollBehavior: "none" }}>
          {children}
        </InputSelectPrimitive.Viewport>
      </StyledContent>
    </InputSelectPrimitive.Portal>
  );
}
InputSelectContent.displayName = InputSelectPrimitive.Content.displayName;

/** Individual InputSelect option rendered in the menu. */
function InputSelectItem(
  props: React.ComponentPropsWithoutRef<typeof InputSelectPrimitive.Item> & {
    ref?: React.Ref<React.ComponentRef<typeof InputSelectPrimitive.Item>>;
  }
) {
  const { ref, children, ...rest } = props;

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
}
InputSelectItem.displayName = InputSelectPrimitive.Item.displayName;

/** Horizontal separator rendered between the options. */
function InputSelectSeparator({
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof InputSelectPrimitive.Separator> & {
  ref?: React.Ref<React.ComponentRef<typeof InputSelectPrimitive.Separator>>;
}) {
  return (
    <InputSelectPrimitive.Separator ref={ref} asChild>
      <Separator {...props} />
    </InputSelectPrimitive.Separator>
  );
}
InputSelectSeparator.displayName = InputSelectPrimitive.Separator.displayName;

const Separator = styled.hr`
  margin: 6px 0;
`;

/** Non-selectable heading rendered to group options in the menu. */
function InputSelectHeading({
  ref,
  children,
}: {
  children?: React.ReactNode;
  ref?: React.Ref<HTMLSpanElement>;
}) {
  return (
    <InputSelectPrimitive.Group>
      <InputSelectPrimitive.Label asChild>
        <Heading ref={ref}>{children}</Heading>
      </InputSelectPrimitive.Label>
    </InputSelectPrimitive.Group>
  );
}
InputSelectHeading.displayName = "InputSelectHeading";

const Heading = styled(Text).attrs({
  type: "tertiary",
  size: "xsmall",
  weight: "bold",
})`
  display: block;
  padding-block: 8px 4px;
  padding-inline: 8px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

/** Styled components. */
const StyledContent = styled(InputSelectPrimitive.Content)`
  z-index: ${depths.menu};
  min-width: var(--radix-select-trigger-width);
  max-width: 400px;
  min-height: 44px;
  max-height: 350px;

  padding: 4px;
  ${borderRadius(8)}
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
  InputSelectHeading,
};
