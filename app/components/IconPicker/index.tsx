import * as Popover from "@radix-ui/react-popover";
import * as Tabs from "@radix-ui/react-tabs";
import { SmileyIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled, { css } from "styled-components";
import Icon from "@shared/components/Icon";
import { s, hover, depths } from "@shared/styles";
import theme from "@shared/styles/theme";
import { IconType } from "@shared/types";
import { determineIconType } from "@shared/utils/icon";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";
import useMobile from "~/hooks/useMobile";
import useWindowSize from "~/hooks/useWindowSize";
import { fadeAndScaleIn } from "~/styles/animations";
import EmojiPanel from "./components/EmojiPanel";
import IconPanel from "./components/IconPanel";
import { PopoverButton } from "./components/PopoverButton";

const TAB_NAMES = {
  Icon: "icon",
  Emoji: "emoji",
} as const;

type TabName = (typeof TAB_NAMES)[keyof typeof TAB_NAMES];

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
  children?: React.ReactNode;
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
  children,
}: Props) => {
  const { t } = useTranslation();

  const { width: windowWidth } = useWindowSize();
  const isMobile = useMobile();

  const [query, setQuery] = React.useState("");
  const [chosenColor, setChosenColor] = React.useState(color);
  const [isOpen, setIsOpen] = React.useState(false);

  const iconType = determineIconType(icon);
  const defaultTab = React.useMemo(
    () =>
      iconType === IconType.Emoji ? TAB_NAMES["Emoji"] : TAB_NAMES["Icon"],
    [iconType]
  );

  const [selectedTab, setSelectedTab] = React.useState<TabName>(defaultTab);

  const popoverWidth = isMobile ? windowWidth : POPOVER_WIDTH;
  // In mobile, popover is absolutely positioned to leave 8px on both sides.
  const panelWidth = isMobile ? windowWidth - 16 : popoverWidth;

  const resetDefaultTab = React.useCallback(() => {
    setSelectedTab(defaultTab);
  }, [defaultTab]);

  const handleIconChange = React.useCallback(
    (ic: string) => {
      setIsOpen(false);
      const icType = determineIconType(ic);
      const finalColor = icType === IconType.SVG ? chosenColor : null;
      onChange(ic, finalColor);
    },
    [onChange, chosenColor]
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
    setIsOpen(false);
    onChange(null, null);
  }, [onChange]);

  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      setIsOpen(open);
      if (open) {
        onOpen?.();
      } else {
        onClose?.();
        setQuery("");
        resetDefaultTab();
      }
    },
    [onOpen, onClose, resetDefaultTab]
  );

  const handleTabChange = React.useCallback((value: string) => {
    setSelectedTab(value as TabName);
  }, []);

  // Update selected tab when default tab changes
  React.useEffect(() => {
    setSelectedTab(defaultTab);
  }, [defaultTab]);

  return (
    <Popover.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <PopoverButton
          aria-label={t("Show menu")}
          className={className}
          size={size}
          $borderOnHover={borderOnHover}
        >
          {children ? (
            children
          ) : iconType && icon ? (
            <Icon value={icon} color={color} size={size} initial={initial} />
          ) : (
            <StyledSmileyIcon color={theme.placeholder} size={size} />
          )}
        </PopoverButton>
      </Popover.Trigger>
      <Popover.Portal>
        <StyledPopoverContent
          side={popoverPosition === "right" ? "right" : "bottom"}
          align={popoverPosition === "bottom-start" ? "start" : "center"}
          sideOffset={0}
          width={popoverWidth}
          aria-label={t("Icon Picker")}
          onClick={(e) => e.stopPropagation()}
        >
          <Tabs.Root value={selectedTab} onValueChange={handleTabChange}>
            <TabActionsWrapper justify="space-between" align="center">
              <Tabs.List>
                <StyledTab
                  value={TAB_NAMES["Icon"]}
                  aria-label={t("Icons")}
                  $active={selectedTab === TAB_NAMES["Icon"]}
                >
                  {t("Icons")}
                </StyledTab>
                <StyledTab
                  value={TAB_NAMES["Emoji"]}
                  aria-label={t("Emojis")}
                  $active={selectedTab === TAB_NAMES["Emoji"]}
                >
                  {t("Emojis")}
                </StyledTab>
              </Tabs.List>
              {allowDelete && icon && (
                <RemoveButton onClick={handleIconRemove}>
                  {t("Remove")}
                </RemoveButton>
              )}
            </TabActionsWrapper>
            <StyledTabContent value={TAB_NAMES["Icon"]}>
              <IconPanel
                panelWidth={panelWidth}
                initial={initial ?? "?"}
                color={chosenColor}
                query={query}
                panelActive={isOpen && selectedTab === TAB_NAMES["Icon"]}
                onIconChange={handleIconChange}
                onColorChange={handleIconColorChange}
                onQueryChange={setQuery}
              />
            </StyledTabContent>
            <StyledTabContent value={TAB_NAMES["Emoji"]}>
              <EmojiPanel
                panelWidth={panelWidth}
                query={query}
                panelActive={isOpen && selectedTab === TAB_NAMES["Emoji"]}
                onEmojiChange={handleIconChange}
                onQueryChange={setQuery}
              />
            </StyledTabContent>
          </Tabs.Root>
        </StyledPopoverContent>
      </Popover.Portal>
    </Popover.Root>
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

const StyledTab = styled(Tabs.Trigger)<{ $active: boolean }>`
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

const StyledTabContent = styled(Tabs.Content)`
  height: 410px;
  overflow-y: auto;
`;

const StyledPopoverContent = styled(Popover.Content)<{ width: number }>`
  animation: ${fadeAndScaleIn} 200ms ease;
  transform-origin: 75% 0;
  background: ${s("menuBackground")};
  border-radius: 6px;
  padding: 6px 0;
  max-height: 75vh;
  box-shadow: ${s("menuShadow")};
  z-index: ${depths.modal};
  width: ${(props) => props.width}px;
  overflow: hidden;
  outline: none;

  @media (max-width: 768px) {
    position: fixed;
    z-index: ${depths.menu};
    top: 50px;
    left: 8px;
    right: 8px;
    width: auto;
  }
`;

export default React.memo(IconPicker);
