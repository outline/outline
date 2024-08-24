import { CloseIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import Document from "~/models/Document";
import { StyledButton } from "~/components/FilterOptions";
import Tooltip from "~/components/Tooltip";

type Props = {
  document: Document;
  onClick: React.MouseEventHandler;
};

export function DocumentFilter(props: Props) {
  const { t } = useTranslation();

  return (
    <div>
      <Tooltip content={t("Remove document filter")} delay={350}>
        <StyledButton onClick={props.onClick} icon={<CloseIcon />} neutral>
          {props.document.title}
        </StyledButton>
      </Tooltip>
    </div>
  );
}
