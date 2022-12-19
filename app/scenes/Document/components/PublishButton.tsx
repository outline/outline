import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { usePopoverState, PopoverDisclosure } from "reakit/Popover";
import styled from "styled-components";
import { depths } from "@shared/styles";
import Document from "~/models/Document";
import Button from "~/components/Button";
import Popover from "~/components/Popover";
import PublishPopover from "./PublishPopover";

type Props = {
  document: Document;
};

function PublishButton({ document }: Props) {
  const { t } = useTranslation();
  const popover = usePopoverState({
    gutter: 0,
    placement: "bottom-end",
    unstable_fixed: true,
  });

  return (
    <>
      <PopoverDisclosure {...popover}>
        {(props) => (
          <Button disclosure {...props}>
            {t("Publish")}
          </Button>
        )}
      </PopoverDisclosure>

      <StyledPopover {...popover} aria-label={t("Publish")}>
        <PublishPopover document={document} />
      </StyledPopover>
    </>
  );
}

const StyledPopover = styled(Popover)`
  z-index: ${depths.popover};
  > :first-child {
    max-height: 53vh;
  }
`;

export default observer(PublishButton);
