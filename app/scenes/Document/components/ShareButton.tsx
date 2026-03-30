import { observer } from "mobx-react";
import { GlobeIcon } from "outline-icons";
import { Suspense, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import type Document from "~/models/Document";
import Button from "~/components/Button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "~/components/primitives/Popover";
import useMobile from "~/hooks/useMobile";
import useShareDataLoader from "~/hooks/useShareDataLoader";
import useStores from "~/hooks/useStores";
import { preventDefault } from "~/utils/events";
import lazyWithRetry from "~/utils/lazyWithRetry";

const SharePopover = lazyWithRetry(
  () => import("~/components/Sharing/Document")
);

type Props = {
  /** Document being shared */
  document: Document;
};

function ShareButton({ document }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { shares } = useStores();
  const isMobile = useMobile();
  const share = shares.getByDocumentId(document.id);
  const sharedParent = shares.getByDocumentParents(document);
  const domain = share?.domain || sharedParent?.domain;
  const { preload, loading, reset } = useShareDataLoader({ document });

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

  const icon = document.isPubliclyShared ? <GlobeIcon /> : undefined;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger>
        <Button icon={icon} neutral onMouseEnter={preload}>
          {t("Share")} {domain && <>&middot; {domain}</>}
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
            document={document}
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
