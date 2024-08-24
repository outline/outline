import { observer } from "mobx-react";
import { GlobeIcon, PadlockIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { usePopoverState, PopoverDisclosure } from "reakit/Popover";
import Collection from "~/models/Collection";
import Button from "~/components/Button";
import Popover from "~/components/Popover";
import SharePopover from "~/components/Sharing/Collection/SharePopover";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useMobile from "~/hooks/useMobile";
import useStores from "~/hooks/useStores";

type Props = {
  /** Collection being shared */
  collection: Collection;
};

function ShareButton({ collection }: Props) {
  const { t } = useTranslation();
  const { shares } = useStores();
  const team = useCurrentTeam();
  const share = shares.getByCollectionId(collection.id);
  const isPubliclyShared =
    team.sharing !== false && collection?.sharing !== false && share?.published;

  const popover = usePopoverState({
    gutter: 0,
    placement: "bottom-end",
    unstable_fixed: true,
  });
  const isMobile = useMobile();
  if (isMobile) {
    return null;
  }

  const icon = isPubliclyShared ? (
    <GlobeIcon />
  ) : collection.permission ? undefined : (
    <PadlockIcon />
  );

  return (
    <>
      <PopoverDisclosure {...popover}>
        {(props) => (
          <Button icon={icon} neutral {...props}>
            {t("Share")}
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
          collection={collection}
          onRequestClose={popover.hide}
          visible={popover.visible}
        />
      </Popover>
    </>
  );
}

export default observer(ShareButton);
