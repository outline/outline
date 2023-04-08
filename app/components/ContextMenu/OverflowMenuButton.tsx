import { MoreIcon } from "outline-icons";
import * as React from "react";
import { MenuButton } from "reakit/Menu";
import NudeButton from "~/components/NudeButton";

type Props = React.ComponentProps<typeof MenuButton> & {
  className?: string;
};

export default function OverflowMenuButton({ className, ...rest }: Props) {
  return (
    <MenuButton {...rest}>
      {(props) => (
        <NudeButton className={className} {...props}>
          <MoreIcon />
        </NudeButton>
      )}
    </MenuButton>
  );
}
