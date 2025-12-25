import { ReactionIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import EventBoundary from "@shared/components/EventBoundary";
import { createLazyComponent } from "~/components/LazyLoad";
import NudeButton from "~/components/NudeButton";
import PlaceholderText from "~/components/PlaceholderText";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "~/components/primitives/Popover";
import useMobile from "~/hooks/useMobile";
import useWindowSize from "~/hooks/useWindowSize";
import Tooltip from "../Tooltip";
import { HStack } from "../primitives/HStack";
import { VStack } from "../primitives/VStack";

const EmojiPanel = createLazyComponent(
  () => import("~/components/IconPicker/components/EmojiPanel")
);

type Props = {
  /** Callback when an emoji is selected by the user. */
  onSelect: (emoji: string) => Promise<void>;
  /** Optional classname. */
  className?: string;
  size?: number;
};

const ReactionPicker: React.FC<Props> = ({ onSelect, className, size }) => {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);

  const { width: windowWidth } = useWindowSize();
  const isMobile = useMobile();

  const [query, setQuery] = React.useState("");

  const popoverWidth = isMobile ? windowWidth : 300;
  // In mobile, popover is absolutely positioned to leave 8px on both sides.
  const panelWidth = isMobile ? windowWidth - 16 : popoverWidth;

  const handleEmojiSelect = React.useCallback(
    (emoji: string) => {
      setOpen(false);
      void onSelect(emoji);
    },
    [onSelect]
  );

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <Tooltip content={t("Add reaction")} placement="top">
        <PopoverTrigger>
          <NudeButton
            aria-label={t("Reaction picker")}
            className={className}
            onMouseEnter={() => EmojiPanel.preload()}
            onClick={(e) => e.stopPropagation()}
            size={size}
          >
            <ReactionIcon size={22} />
          </NudeButton>
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent
        aria-label={t("Reaction picker")}
        width={popoverWidth}
        side="bottom"
        align="end"
        shrink
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {open && (
          <React.Suspense fallback={<Placeholder />}>
            <EventBoundary>
              <EmojiPanel.Component
                height={300}
                panelWidth={panelWidth}
                query={query}
                onEmojiChange={handleEmojiSelect}
                onQueryChange={setQuery}
                panelActive
              />
            </EventBoundary>
          </React.Suspense>
        )}
      </PopoverContent>
    </Popover>
  );
};

const Placeholder = React.memo(
  () => (
    <VStack spacing={6} style={{ height: "300px", padding: "6px 12px" }}>
      <HStack>
        <PlaceholderText height={32} minWidth={90} />
        <PlaceholderText height={32} width={32} />
      </HStack>
      <PlaceholderText height={24} width={120} />
    </VStack>
  ),
  () => true
);
Placeholder.displayName = "ReactionPickerPlaceholder";

export default ReactionPicker;
