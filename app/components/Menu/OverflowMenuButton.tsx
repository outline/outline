import type * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { MoreIcon } from "outline-icons";
import * as React from "react";
import Button from "~/components/Button";
import NudeButton from "~/components/NudeButton";

type Props = React.ComponentPropsWithoutRef<
  typeof DropdownMenuPrimitive.Trigger
> & {
  neutral?: boolean;
  className?: string;
};

export const OverflowMenuButton = React.forwardRef<HTMLButtonElement, Props>(
  ({ neutral, className, ...rest }, ref) =>
    neutral ? (
      <Button ref={ref} icon={<MoreIcon />} neutral borderOnHover {...rest} />
    ) : (
      <NudeButton ref={ref} className={className} {...rest}>
        <MoreIcon />
      </NudeButton>
    )
);
OverflowMenuButton.displayName = "OverflowMenuButton";
