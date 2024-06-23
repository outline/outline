import { observer } from "mobx-react";
import { CollectionIcon } from "outline-icons";
import { getLuminance } from "polished";
import * as React from "react";
import { randomElement } from "@shared/random";
import { colorPalette } from "@shared/utils/collections";
import Collection from "~/models/Collection";
import Icon from "~/components/Icon";
import useStores from "~/hooks/useStores";

type Props = {
  /** The collection to show an icon for */
  collection: Collection;
  /** Whether the icon should be the "expanded" graphic when displaying the default collection icon */
  expanded?: boolean;
  /** The size of the icon, 24px is default to match standard icons */
  size?: number;
  /** The color of the icon, defaults to the collection color */
  color?: string;
  className?: string;
};

function ResolvedCollectionIcon({
  collection,
  color: inputColor,
  expanded,
  size,
  className,
}: Props) {
  const { ui } = useStores();

  if (!collection.icon || collection.icon === "collection") {
    // If the chosen icon color is very dark then we invert it in dark mode
    // otherwise it will be impossible to see against the dark background.
    const collectionColor = collection.color ?? randomElement(colorPalette);
    const color =
      inputColor ||
      (ui.resolvedTheme === "dark" && collectionColor !== "currentColor"
        ? getLuminance(collectionColor) > 0.09
          ? collectionColor
          : "currentColor"
        : collectionColor);

    return (
      <CollectionIcon
        color={color}
        expanded={expanded}
        size={size}
        className={className}
      />
    );
  }

  return (
    <Icon
      value={collection.icon}
      color={inputColor ?? collection.color ?? undefined}
      size={size}
      initial={collection.initial}
      className={className}
    />
  );
}

export default observer(ResolvedCollectionIcon);
