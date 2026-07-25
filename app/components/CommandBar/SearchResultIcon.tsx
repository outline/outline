import { DocumentIcon } from "outline-icons";
import Icon from "@shared/components/Icon";
import type { SearchIndexDocument } from "./SearchIndex";

interface Props {
  /** The matched document to show an icon for. */
  document: SearchIndexDocument;
  /** Icon size, applied by the command bar when rendering the action. */
  size?: number;
}

/**
 * Displays the icon for a document in the command bar, falling back to a
 * generic document icon when it has none of its own.
 */
export function SearchResultIcon({ document, size }: Props) {
  if (!document.icon) {
    return <DocumentIcon size={size} />;
  }

  return (
    <Icon
      value={document.icon}
      initial={document.title}
      color={document.color ?? undefined}
      size={size}
    />
  );
}
