import { observer } from "mobx-react";
import { GlobeIcon } from "outline-icons";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import Document from "~/models/Document";
import Button from "~/components/Button";
import SharePopover from "~/components/Sharing/Document";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "~/components/primitives/Popover";
import useMobile from "~/hooks/useMobile";
import useStores from "~/hooks/useStores";

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
        <SharePopover
          document={document}
          onRequestClose={closePopover}
          visible={open}
        />
      </PopoverContent>
    </Popover>
  );
}

export default observer(ShareButton);
