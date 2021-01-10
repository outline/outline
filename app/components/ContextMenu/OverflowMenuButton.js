// @flow
import { MoreIcon } from "outline-icons";
import * as React from "react";
import { MenuButton } from "reakit/Menu";
import NudeButton from "components/NudeButton";

export default function OverflowMenuButton({
  iconColor,
  className,
  ...rest
}: any) {
  return (
    <MenuButton {...rest}>
      {(props) => (
        <NudeButton className={className} {...props}>
          <MoreIcon color={iconColor} />
        </NudeButton>
      )}
    </MenuButton>
  );
}
