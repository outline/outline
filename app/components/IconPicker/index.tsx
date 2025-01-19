import { SmileyIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import {
  PopoverDisclosure,
  Tab,
  TabList,
  TabPanel,
  usePopoverState,
  useTabState,
} from "reakit";
import styled, { css } from "styled-components";
import Icon from "@shared/components/Icon";
import { s, hover } from "@shared/styles";
import theme from "@shared/styles/theme";
import { IconType } from "@shared/types";
import { determineIconType } from "@shared/utils/icon";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";
import Popover from "~/components/Popover";
import useMobile from "~/hooks/useMobile";
import useOnClickOutside from "~/hooks/useOnClickOutside";
import usePrevious from "~/hooks/usePrevious";
import useWindowSize from "~/hooks/useWindowSize";
import EmojiPanel from "./components/EmojiPanel";
import IconPanel from "./components/IconPanel";
import { PopoverButton } from "./components/PopoverButton";

const TAB_NAMES = {
  Icon: "icon",
  Emoji: "emoji",
} as const;

const POPOVER_WIDTH = 408;

type Props = {
  icon: string | null;
  color: string;
  size?: number;
  initial?: string;
  className?: string;
  popoverPosition: "bottom-start" | "right";
  allowDelete?: boolean;
  borderOnHover?: boolean;
  onChange: (icon: string | null, color: string | null) => void;
  onOpen?: () => void;
  onClose?: () => void;
};

const IconPicker = ({
  icon,
  color,
  size = 24,
  initial,
  className,
  popoverPosition,
  allowDelete,
  onChange,
  onOpen,
  onClose,
  borderOnHover,
}: Props) => {
  const { t } = useTranslation();

  const { width: windowWidth } = useWindowSize();
  const isMobile = useMobile();

  const [query, setQuery] = React.useState("");
  const [chosenColor, setChosenColor] = React.useState(color);
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  const iconType = determineIconType(icon);
  const defaultTab = React.useMemo(
    () =>
      iconType === IconType.Emoji ? TAB_NAMES["Emoji"] : TAB_NAMES["Icon"],
    [iconType]
  );

  const popover = usePopoverState({
    placement: popoverPosition,
    modal: true,
    unstable_offset: [0, 0],
  });
  const { hide, show, visible } = popover;
  const tab = useTabState({ selectedId: defaultTab });
  const previouslyVisible = usePrevious(popover.visible);

  const popoverWidth = isMobile ? windowWidth : POPOVER_WIDTH;
  // In mobile, popover is absolutely positioned to leave 8px on both sides.
  const panelWidth = isMobile ? windowWidth - 16 : popoverWidth;

  const resetDefaultTab = React.useCallback(() => {
    tab.select(defaultTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultTab]);

  const handleIconChange = React.useCallback(
    (ic: string) => {
      hide();
      const icType = determineIconType(ic);
      const finalColor = icType === IconType.SVG ? chosenColor : null;
      onChange(ic, finalColor);
    },
    [hide, onChange, chosenColor]
  );

  const handleIconColorChange = React.useCallback(
    (c: string) => {
      setChosenColor(c);

      const icType = determineIconType(icon);
      // Outline icon set; propagate color change
      if (icType === IconType.SVG) {
        onChange(icon, c);
      }
    },
    [icon, onChange]
  );

  const handleIconRemove = React.useCallback(() => {
    hide();
    onChange(null, null);
  }, [hide, onChange]);

  const handlePopoverButtonClick = React.useCallback(
    (ev: React.MouseEvent) => {
      ev.stopPropagation();
      if (visible) {
        hide();
      } else {
        show();
      }
    },
    [hide, show, visible]
  );

  // Popover open effect
  React.useEffect(() => {
    if (visible && !previouslyVisible) {
      onOpen?.();
    } else if (!visible && previouslyVisible) {
      onClose?.();
      setQuery("");
      resetDefaultTab();
    }
  }, [visible, previouslyVisible, onOpen, onClose, resetDefaultTab]);

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
            aria-label={t("Show menu")}
            className={className}
            size={size}
            onClick={handlePopoverButtonClick}
            $borderOnHover={borderOnHover}
          >
            {iconType && icon ? (
              <Icon value={icon} color={color} size={size} initial={initial} />
            ) : (
              <StyledSmileyIcon color={theme.placeholder} size={size} />
            )}
          </PopoverButton>
        )}
      </PopoverDisclosure>
      <Popover
        {...popover}
        ref={contentRef}
        width={popoverWidth}
        shrink
        aria-label={t("Icon Picker")}
        onClick={(e) => e.stopPropagation()}
        hideOnClickOutside={false}
      >
        <>
          <TabActionsWrapper justify="space-between" align="center">
            <TabList {...tab}>
              <StyledTab
                {...tab}
                id={TAB_NAMES["Icon"]}
                aria-label={t("Icons")}
                $active={tab.selectedId === TAB_NAMES["Icon"]}
              >
                {t("Icons")}
              </StyledTab>
              <StyledTab
                {...tab}
                id={TAB_NAMES["Emoji"]}
                aria-label={t("Emojis")}
                $active={tab.selectedId === TAB_NAMES["Emoji"]}
              >
                {t("Emojis")}
              </StyledTab>
            </TabList>
            {allowDelete && icon && (
              <RemoveButton onClick={handleIconRemove}>
                {t("Remove")}
              </RemoveButton>
            )}
          </TabActionsWrapper>
          <StyledTabPanel {...tab}>
            <IconPanel
              panelWidth={panelWidth}
              initial={initial ?? "?"}
              color={chosenColor}
              query={query}
              panelActive={
                popover.visible && tab.selectedId === TAB_NAMES["Icon"]
              }
              onIconChange={handleIconChange}
              onColorChange={handleIconColorChange}
              onQueryChange={setQuery}
            />
          </StyledTabPanel>
          <StyledTabPanel {...tab}>
            <EmojiPanel
              panelWidth={panelWidth}
              query={query}
              panelActive={
                popover.visible && tab.selectedId === TAB_NAMES["Emoji"]
              }
              onEmojiChange={handleIconChange}
              onQueryChange={setQuery}
            />
          </StyledTabPanel>
        </>
      </Popover>
    </>
  );
};

const StyledSmileyIcon = styled(SmileyIcon)`
  flex-shrink: 0;

  @media print {
    display: none;
  }
`;

const RemoveButton = styled(NudeButton)`
  width: auto;
  font-weight: 500;
  font-size: 14px;
  color: ${s("textTertiary")};
  padding: 8px 12px;
  transition: color 100ms ease-in-out;
  &: ${hover} {
    color: ${s("textSecondary")};
  }
`;

const TabActionsWrapper = styled(Flex)`
  padding-left: 12px;
  border-bottom: 1px solid ${s("inputBorder")};
`;

const StyledTab = styled(Tab)<{ $active: boolean }>`
  position: relative;
  font-weight: 500;
  font-size: 14px;
  cursor: var(--pointer);
  background: none;
  border: 0;
  padding: 8px 12px;
  user-select: none;
  color: ${({ $active }) => ($active ? s("textSecondary") : s("textTertiary"))};
  transition: color 100ms ease-in-out;

  &: ${hover} {
    color: ${s("textSecondary")};
  }

  ${({ $active }) =>
    $active &&
    css`
      &:after {
        content: "";
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 1px;
        background: ${s("textSecondary")};
      }
    `}
`;

const StyledTabPanel = styled(TabPanel)`
  height: 410px;
  overflow-y: auto;
`;

export default React.memo(IconPicker);
