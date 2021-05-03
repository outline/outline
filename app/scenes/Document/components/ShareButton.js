// @flow
import { observer } from "mobx-react";
import { GlobeIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { usePopoverState, PopoverDisclosure } from "reakit/Popover";
import Document from "models/Document";
import Button from "components/Button";
import Popover from "components/Popover";
import Tooltip from "components/Tooltip";
import SharePopover from "./SharePopover";
import useStores from "hooks/useStores";

type Props = {|
  document: Document,
|};

function ShareButton({ document }: Props) {
  const { t } = useTranslation();
  const { shares } = useStores();
  const share = shares.getByDocumentId(document.id);
  const isPubliclyShared = share && share.published;
  const popover = usePopoverState({
    gutter: 0,
    placement: "bottom-end",
  });

  return (
    <>
      <PopoverDisclosure {...popover}>
        {(props) => (
          <Tooltip
            tooltip={
              isPubliclyShared ? (
                <Trans>
                  Anyone with the link <br />
                  can view this document
                </Trans>
              ) : (
                ""
              )
            }
            delay={500}
            placement="bottom"
          >
            <Button
              icon={isPubliclyShared ? <GlobeIcon /> : undefined}
              neutral
              {...props}
            >
              {t("Share")}
            </Button>
          </Tooltip>
        )}
      </PopoverDisclosure>
      <Popover {...popover} aria-label={t("Share")}>
        <SharePopover
          document={document}
          share={share}
          onSubmit={popover.hide}
        />
      </Popover>
    </>
  );
}

export default observer(ShareButton);
