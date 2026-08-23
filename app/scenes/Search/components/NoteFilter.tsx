import { CloseIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import type Note from "~/models/Note";
import { StyledButton } from "~/components/FilterOptions";
import Tooltip from "~/components/Tooltip";
type Props = {
  /** The currently selected document */
  note: Note;
  /** Callback to remove the document filter */
  onClick: React.MouseEventHandler;
};
export function NoteFilter(props: Props) {
  const { t } = useTranslation();
  return (
    <div>
      <Tooltip content={t("Remove document filter")}>
        <StyledButton onClick={props.onClick} icon={<CloseIcon />} neutral>
          {props.note.titleWithDefault}
        </StyledButton>
      </Tooltip>
    </div>
  );
}
