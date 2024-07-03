import { observer } from "mobx-react";
import { GlobeIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { usePopoverState, PopoverDisclosure } from "reakit/Popover";
import Document from "~/models/Document";
import Button from "~/components/Button";
import Popover from "~/components/Popover";
import SharePopover from "~/components/Sharing/Document";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useMobile from "~/hooks/useMobile";
import useStores from "~/hooks/useStores";

type Props = {
  /** Document being shared */
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

  const isMobile = useMobile();
  if (isMobile) {
    return null;
  }

  const icon = isPubliclyShared ? <GlobeIcon /> : undefined;

  return (
    <>
      <PopoverDisclosure {...popover}>
        {(props) => (
          <Button icon={icon} neutral {...props}>
            {t("Share")} {domain && <>&middot; {domain}</>}
          </Button>
        )}
      </PopoverDisclosure>

      <Popover
        {...popover}
        aria-label={t("Share")}
        width={400}
        scrollable={false}
      >
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
