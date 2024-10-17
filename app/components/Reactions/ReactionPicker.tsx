import { ReactionIcon } from "outline-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import { PopoverDisclosure, usePopoverState } from "reakit";
import styled from "styled-components";
import EmojiPanel from "~/components/IconPicker/components/EmojiPanel";
import NudeButton from "~/components/NudeButton";
import Popover from "~/components/Popover";
import useMobile from "~/hooks/useMobile";
import useOnClickOutside from "~/hooks/useOnClickOutside";
import useWindowSize from "~/hooks/useWindowSize";

type Props = {
  /** CSS class name */
  className?: string;
  onSelect: (emoji: string) => Promise<void>;
  onOpen?: () => void;
  onClose?: () => void;
};

const ReactionPicker: React.FC<Props> = ({
  className,
  onSelect,
  onOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  const popover = usePopoverState({
    modal: true,
    unstable_offset: [0, 0],
  });

  const { width: windowWidth } = useWindowSize();
  const isMobile = useMobile();

  const [query, setQuery] = React.useState("");
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  const popoverWidth = isMobile ? windowWidth : 300;
  // In mobile, popover is absolutely positioned to leave 8px on both sides.
  const panelWidth = isMobile ? windowWidth - 16 : popoverWidth;

  const handlePopoverButtonClick = React.useCallback(
    (ev: React.MouseEvent) => {
      ev.stopPropagation();
      if (popover.visible) {
        popover.hide();
      } else {
        popover.show();
      }
    },
    [popover]
  );

  const handleEmojiSelect = React.useCallback(
    (emoji: string) => {
      popover.hide();
      void onSelect(emoji);
    },
    [popover, onSelect]
  );

  // Popover open effect
  React.useEffect(() => {
    if (popover.visible) {
      onOpen?.();
    } else {
      onClose?.();
    }
  }, [popover.visible, onOpen, onClose]);

  // Custom click outside handling rather than using `hideOnClickOutside` from reakit so that we can
  // prevent event bubbling.
  useOnClickOutside(
    contentRef,
    (event) => {
      if (
        popover.visible &&
        !popover.unstable_disclosureRef.current?.contains(event.target as Node)
      ) {
        event.stopPropagation();
        event.preventDefault();
        popover.hide();
      }
    },
    { capture: true }
  );

  return (
    <>
      <PopoverDisclosure {...popover}>
        {(props) => (
          <PopoverButton
            {...props}
            className={className}
            onClick={handlePopoverButtonClick}
          >
            <ReactionIcon size={20} />
          </PopoverButton>
        )}
      </PopoverDisclosure>
      <Popover
        {...popover}
        ref={contentRef}
        width={popoverWidth}
        shrink
        aria-label={t("Reaction Picker")}
        onClick={(e) => e.stopPropagation()}
        hideOnClickOutside={false}
      >
        <ScrollableContainer>
          <EmojiPanel
            panelWidth={panelWidth}
            query={query}
            panelActive={true}
            onEmojiChange={handleEmojiSelect}
            onQueryChange={setQuery}
          />
        </ScrollableContainer>
      </Popover>
    </>
  );
};

const ScrollableContainer = styled.div`
  height: 250px;
  overflow-y: auto;
`;

const PopoverButton = styled(NudeButton)`
  border-radius: 50%;
`;

export default ReactionPicker;
