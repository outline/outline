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
import useShareDataLoader from "~/hooks/useShareDataLoader";
import useStores from "~/hooks/useStores";
import { preventDefault } from "~/utils/events";
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
  const { preload, loading, reset } = useShareDataLoader({ collection });

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      if (isOpen) {
        preload();
      } else {
        reset();
      }
    },
    [preload, reset]
  );

  const closePopover = useCallback(() => {
    handleOpenChange(false);
  }, [handleOpenChange]);

  if (isMobile) {
    return null;
  }

  const icon = isPubliclyShared ? (
    <GlobeIcon />
  ) : collection.permission ? undefined : (
    <PadlockIcon />
  );

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger>
        <Button icon={icon} neutral onMouseEnter={preload}>
          {t("Share")}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        aria-label={t("Share")}
        width={400}
        minHeight={175}
        side="bottom"
        align="end"
        onEscapeKeyDown={preventDefault}
      >
        <Suspense fallback={null}>
          <SharePopover
            collection={collection}
            onRequestClose={closePopover}
            visible={open}
            loading={loading}
          />
        </Suspense>
      </PopoverContent>
    </Popover>
  );
}

export default observer(ShareButton);
