import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { MoreIcon } from "outline-icons";
import * as React from "react";
import NudeButton from "~/components/NudeButton";

type Props = React.ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.Trigger
> & {
  className?: string;
};

export const OverflowMenuButton = React.forwardRef<HTMLButtonElement, Props>(
  ({ className, ...rest }, ref) => (
    <NudeButton ref={ref} className={className} {...rest}>
      <MoreIcon />
    </NudeButton>
  )
);
OverflowMenuButton.displayName = "OverflowMenuButton";
