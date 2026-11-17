import { DocumentIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import type Document from "~/models/Document";
import { Chip, ChipContent, ChipRemoveButton, ChipStatic } from "./FilterChip";

type Props = {
  /** The currently selected document */
  document: Document;
  /** Callback to remove the document filter */
  onRemove: () => void;
};

export function DocumentFilter(props: Props) {
  const { t } = useTranslation();

  return (
    <Chip>
      <ChipStatic>
        <ChipContent
          icon={<DocumentIcon />}
          label={t("Document")}
          value={props.document.displayTitle}
        />
      </ChipStatic>
      <ChipRemoveButton
        label={t("Remove document filter")}
        onClick={props.onRemove}
      />
    </Chip>
  );
}
