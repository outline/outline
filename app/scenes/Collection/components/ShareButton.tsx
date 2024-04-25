import { observer } from "mobx-react";
import { GlobeIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { usePopoverState, PopoverDisclosure } from "reakit/Popover";
import Collection from "~/models/Collection";
import Button from "~/components/Button";
import Popover from "~/components/Popover";
import SharePopover from "~/components/Sharing/Collection/SharePopover";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useStores from "~/hooks/useStores";

type Props = {
  collection: Collection;
};

function ShareButton({ collection }: Props) {
  const { t } = useTranslation();
  const { shares } = useStores();
  const team = useCurrentTeam();
  const share = shares.getByCollectionId(collection.id);
  const domain = share?.domain;
  const isPubliclyShared =
    team.sharing !== false && collection?.sharing !== false && share?.published;

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
          collection={collection}
          share={share}
          onRequestClose={popover.hide}
          visible={popover.visible}
        />
      </Popover>
    </>
  );
}

export default observer(ShareButton);
