import { observer } from "mobx-react";
import { GlobeIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { usePopoverState, PopoverDisclosure } from "reakit/Popover";
import Document from "~/models/Document";
import Button from "~/components/Button";
import Popover from "~/components/Popover";
import SharePopover from "~/components/Sharing";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useStores from "~/hooks/useStores";

type Props = {
  document: Document;
};

function ShareButton({ document }: Props) {
  const { t } = useTranslation();
  const { shares } = useStores();
  const team = useCurrentTeam();
  const share = shares.getByDocumentId(document.id);
  const sharedParent = shares.getByDocumentParents(document.id);
  const domain = share?.domain || sharedParent?.domain;
  const isPubliclyShared =
    team.sharing !== false &&
    document.collection?.sharing !== false &&
    (share?.published || (sharedParent?.published && !document.isDraft));

  const popover = usePopoverState({
    gutter: 0,
    placement: "bottom-end",
    unstable_fixed: true,
  });

  return (
    <>
      <PopoverDisclosure {...popover}>
        {(props) => (
          <Button
            icon={isPubliclyShared ? <GlobeIcon /> : undefined}
            neutral
            {...props}
          >
            {t("Share")} {domain && <>&middot; {domain}</>}
          </Button>
        )}
      </PopoverDisclosure>

      <Popover {...popover} aria-label={t("Share")} width={400}>
        <SharePopover
          document={document}
          share={share}
          sharedParent={sharedParent}
          onRequestClose={popover.hide}
          visible={popover.visible}
        />
      </Popover>
    </>
  );
}

export default observer(ShareButton);
