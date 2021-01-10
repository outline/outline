// @flow
import { MoreIcon } from "outline-icons";
import * as React from "react";
import { MenuButton } from "reakit/menu";
import NudeButton from "components/NudeButton";

export default function OverflowMenuButton(rest: any) {
  return (
    <MenuButton {...rest}>
      {(props) => (
        <NudeButton {...props}>
          <MoreIcon />
        </NudeButton>
      )}
    </MenuButton>
  );
}
