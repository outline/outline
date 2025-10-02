import { observer } from "mobx-react";
import { GlobeIcon } from "outline-icons";
import { Suspense, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import Document from "~/models/Document";
import Button from "~/components/Button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "~/components/primitives/Popover";
import useMobile from "~/hooks/useMobile";
import useStores from "~/hooks/useStores";
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

  const closePopover = useCallback(() => {
    setOpen(false);
  }, []);

  if (isMobile) {
    return null;
  }

  const icon = document.isPubliclyShared ? <GlobeIcon /> : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <Button icon={icon} neutral>
          {t("Share")} {domain && <>&middot; {domain}</>}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        aria-label={t("Share")}
        width={400}
        side="bottom"
        align="end"
      >
        <Suspense fallback={null}>
          <SharePopover
            document={document}
            onRequestClose={closePopover}
            visible={open}
          />
        </Suspense>
      </PopoverContent>
    </Popover>
  );
}

export default observer(ShareButton);
