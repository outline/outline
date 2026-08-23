import { DocumentIcon } from "outline-icons";
import Icon from "@shared/components/Icon";
import type { SearchIndexNote } from "./SearchIndex";
interface Props {
  /** The matched note to show an icon for. */
  note: SearchIndexNote;
  /** Icon size, applied by the command bar when rendering the action. */
  size?: number;
}
/**
 * Displays the icon for a note in the command bar, falling back to a
 * generic document icon when it has none of its own.
 */
export function SearchResultIcon({ note, size }: Props) {
  if (!note.icon) {
    return <DocumentIcon size={size} />;
  }
  return (
    <Icon
      value={note.icon}
      initial={note.title}
      color={note.color ?? undefined}
      size={size}
    />
  );
}
