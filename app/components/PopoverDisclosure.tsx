import * as Popover from "@radix-ui/react-popover";
import * as React from "react";

type PopoverProps = {
  onClick?: (event: React.MouseEvent) => void;
  [key: string]: unknown;
};

type Props = {
  children: React.ReactNode | ((props: PopoverProps) => React.ReactNode);
  show?: () => void;
  hide?: () => void;
  toggle?: () => void;
  visible?: boolean;
} & React.ComponentProps<typeof Popover.Trigger>;

/**
 * A compatibility component that provides a similar API to reakit's PopoverDisclosure
 * but works with Radix UI Popover.
 */
const PopoverDisclosure = React.forwardRef<HTMLButtonElement, Props>(
  ({ children, show, hide, toggle, visible, onClick, ...props }, ref) => {
    const handleClick = React.useCallback(
      (event: React.MouseEvent) => {
        if (onClick) {
          onClick(event);
        }
        if (toggle) {
          toggle();
        }
      },
      [onClick, toggle]
    );

    // If children is a function, call it with popover props for backward compatibility
    const content =
      typeof children === "function"
        ? children({ onClick: handleClick, ...props })
        : children;

    return (
      <Popover.Trigger ref={ref} {...props} onClick={handleClick} asChild>
        {content}
      </Popover.Trigger>
    );
  }
);

PopoverDisclosure.displayName = "PopoverDisclosure";

export default PopoverDisclosure;
