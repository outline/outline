import { observer } from "mobx-react";
import { GlobeIcon, PadlockIcon } from "outline-icons";
import { Suspense, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import type Collection from "~/models/Collection";
import Button from "~/components/Button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "~/components/primitives/Popover";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useMobile from "~/hooks/useMobile";
import useStores from "~/hooks/useStores";
import lazyWithRetry from "~/utils/lazyWithRetry";

const SharePopover = lazyWithRetry(
  () => import("~/components/Sharing/Collection/SharePopover")
);

type Props = {
  /** Collection being shared */
  collection: Collection;
};

function ShareButton({ collection }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { shares } = useStores();
  const isMobile = useMobile();
  const team = useCurrentTeam();
  const share = shares.getByCollectionId(collection.id);
  const isPubliclyShared =
    team.sharing !== false && collection?.sharing !== false && share?.published;

  const closePopover = useCallback(() => {
    setOpen(false);
  }, []);

  const handleMouseEnter = useCallback(() => {
    void collection.share();
  }, [collection]);

  if (isMobile) {
    return null;
  }

  const icon = isPubliclyShared ? (
    <GlobeIcon />
  ) : collection.permission ? undefined : (
    <PadlockIcon />
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <Button icon={icon} neutral onMouseEnter={handleMouseEnter}>
          {t("Share")}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        aria-label={t("Share")}
        width={400}
        minHeight={175}
        side="bottom"
        align="end"
      >
        <Suspense fallback={null}>
          <SharePopover
            collection={collection}
            onRequestClose={closePopover}
            visible={open}
          />
        </Suspense>
      </PopoverContent>
    </Popover>
  );
}

export default observer(ShareButton);
