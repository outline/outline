import { observer } from "mobx-react";
import { GlobeIcon } from "outline-icons";
import { Suspense, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import type Note from "~/models/Note";
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
const SharePopover = lazyWithRetry(() => import("~/components/Sharing/Note"));
type Props = {
  /** Note being shared */
  note: Note;
};
function ShareButton({ note }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { shares } = useStores();
  const isMobile = useMobile();
  const share = shares.getByNoteId(note.id);
  const sharedParent = shares.getByNoteParents(note);
  const domain = share?.domain || sharedParent?.domain;
  const { preload, loading, reset } = useShareDataLoader({ note: note });
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
  const icon = note.isPubliclyShared ? <GlobeIcon /> : undefined;
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
            note={note}
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
