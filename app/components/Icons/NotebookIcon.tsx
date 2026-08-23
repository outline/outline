import { observer } from "mobx-react";
import { CollectionIcon, PrivateCollectionIcon } from "outline-icons";
import { getLuminance } from "polished";
import Icon from "@shared/components/Icon";
import { colorPalette } from "@shared/constants";
import type Notebook from "~/models/Notebook";
import useStores from "~/hooks/useStores";
type Props = {
  /** The notebook to show an icon for */
  notebook: Notebook;
  /** Whether the icon should be the "expanded" graphic when displaying the default notebook icon */
  expanded?: boolean;
  /** The size of the icon, 24px is default to match standard icons */
  size?: number;
  /** The color of the icon, defaults to the notebook color */
  color?: string;
  className?: string;
};
function ResolvedNotebookIcon({
  notebook,
  color: inputColor,
  expanded,
  size,
  className,
}: Props) {
  const { ui } = useStores();
  if (!notebook.icon || notebook.icon === "collection") {
    // If the chosen icon color is very dark then we invert it in dark mode
    // otherwise it will be impossible to see against the dark background.
    const notebookColor = notebook.color ?? colorPalette[0];
    const color =
      inputColor ||
      (ui.resolvedTheme === "dark" && notebookColor !== "currentColor"
        ? getLuminance(notebookColor) > 0.09
          ? notebookColor
          : "currentColor"
        : notebookColor);
    const Component = notebook.isPrivate
      ? PrivateCollectionIcon
      : CollectionIcon;
    return (
      <Component
        color={color}
        expanded={expanded}
        size={size}
        className={className}
      />
    );
  }
  return (
    <Icon
      value={notebook.icon}
      color={inputColor ?? notebook.color ?? undefined}
      size={size}
      initial={notebook.initial}
      className={className}
      forceColor={inputColor ? true : false}
    />
  );
}
export default observer(ResolvedNotebookIcon);
