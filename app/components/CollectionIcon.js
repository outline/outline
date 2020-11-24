// @flow
import { inject, observer } from "mobx-react";
import { PrivateCollectionIcon, CollectionIcon } from "outline-icons";
import { getLuminance } from "polished";
import * as React from "react";
import UiStore from "stores/UiStore";
import Collection from "models/Collection";
import { icons } from "components/IconPicker";

type Props = {
  collection: Collection,
  expanded?: boolean,
  size?: number,
  ui: UiStore,
};

function ResolvedCollectionIcon({ collection, expanded, size, ui }: Props) {
  // If the chosen icon color is very dark then we invert it in dark mode
  // otherwise it will be impossible to see against the dark background.
  const color =
    ui.resolvedTheme === "dark" && collection.color !== "currentColor"
      ? getLuminance(collection.color) > 0.12
        ? collection.color
        : "currentColor"
      : collection.color;

  if (collection.icon && collection.icon !== "collection") {
    try {
      const Component = icons[collection.icon].component;
      return <Component color={color} size={size} />;
    } catch (error) {
      console.warn("Failed to render custom icon " + collection.icon);
    }
  }

  if (collection.private) {
    return (
      <PrivateCollectionIcon color={color} expanded={expanded} size={size} />
    );
  }

  return <CollectionIcon color={color} expanded={expanded} size={size} />;
}

export default inject("ui")(observer(ResolvedCollectionIcon));
