import { observer } from "mobx-react";
import { CollectionIcon } from "outline-icons";
import { getLuminance } from "polished";
import * as React from "react";
import Collection from "~/models/Collection";
import { icons } from "~/components/IconPicker";
import useStores from "~/hooks/useStores";
import Logger from "~/utils/Logger";

type Props = {
  /** The collection to show an icon for */
  collection: Collection;
  /** Whether the icon should be the "expanded" graphic when displaying the default collection icon */
  expanded?: boolean;
  /** The size of the icon, 24px is default to match standard icons */
  size?: number;
  /** The color of the icon, defaults to the collection color */
  color?: string;
};

function ResolvedCollectionIcon({
  collection,
  color: inputColor,
  expanded,
  size,
}: Props) {
  const { ui } = useStores();

  // If the chosen icon color is very dark then we invert it in dark mode
  // otherwise it will be impossible to see against the dark background.
  const color =
    inputColor ||
    (ui.resolvedTheme === "dark" && collection.color !== "currentColor"
      ? getLuminance(collection.color) > 0.09
        ? collection.color
        : "currentColor"
      : collection.color);

  if (collection.icon && collection.icon !== "collection") {
    try {
      const Component = icons[collection.icon].component;
      return (
        <Component color={color} size={size}>
          {collection.initial}
        </Component>
      );
    } catch (error) {
      Logger.warn("Failed to render custom icon", {
        icon: collection.icon,
      });
    }
  }

  return <CollectionIcon color={color} expanded={expanded} size={size} />;
}

export default observer(ResolvedCollectionIcon);
