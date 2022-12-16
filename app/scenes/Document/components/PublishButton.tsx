import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { usePopoverState, PopoverDisclosure } from "reakit/Popover";
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

      <Popover {...popover} aria-label={t("Publish")}>
        <PublishPopover document={document} />
      </Popover>
    </>
  );
}

export default observer(PublishButton);
