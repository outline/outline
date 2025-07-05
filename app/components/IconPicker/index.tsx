import * as Tabs from "@radix-ui/react-tabs";
import { SmileyIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled, { css } from "styled-components";
import Icon from "@shared/components/Icon";
import { s, hover } from "@shared/styles";
import theme from "@shared/styles/theme";
import { IconType } from "@shared/types";
import { determineIconType } from "@shared/utils/icon";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "~/components/primitives/Popover";
import useMobile from "~/hooks/useMobile";
import useWindowSize from "~/hooks/useWindowSize";
import { Drawer, DrawerContent, DrawerTrigger } from "../primitives/Drawer";
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

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [chosenColor, setChosenColor] = React.useState(color);

  const iconType = determineIconType(icon);
  const defaultTab = React.useMemo(
    () =>
      iconType === IconType.Emoji ? TAB_NAMES["Emoji"] : TAB_NAMES["Icon"],
    [iconType]
  );

  const [activeTab, setActiveTab] = React.useState<TabName>(defaultTab);

  const popoverWidth = isMobile ? windowWidth : POPOVER_WIDTH;

  const handleTabChange = React.useCallback((value: string) => {
    setActiveTab(value as TabName);
  }, []);

  const resetDefaultTab = React.useCallback(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const handleOpenChange = React.useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      if (isOpen) {
        onOpen?.();
      } else {
        onClose?.();
        setQuery("");
        resetDefaultTab();
      }
    },
    [onOpen, onClose, resetDefaultTab]
  );

  const handleIconChange = React.useCallback(
    (ic: string) => {
      setOpen(false);
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
      if (icType === IconType.SVG) {
        onChange(icon, c);
      }
    },
    [icon, onChange]
  );

  const handleIconRemove = React.useCallback(() => {
    setOpen(false);
    onChange(null, null);
  }, [setOpen, onChange]);

  const pickerTrigger = (
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
  );

  const pickerContent = (
    <Content
      open={open}
      activeTab={activeTab}
      iconColor={chosenColor}
      iconInitial={initial ?? ""}
      query={query}
      panelWidth={popoverWidth}
      allowDelete={!!(allowDelete && icon)}
      onTabChange={handleTabChange}
      onQueryChange={setQuery}
      onIconChange={handleIconChange}
      onIconColorChange={handleIconColorChange}
      onIconRemove={handleIconRemove}
    />
  );

  // Update selected tab when default tab changes
  React.useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{pickerTrigger}</DrawerTrigger>
        <DrawerContent aria-label={t("Icon Picker")}>
          {pickerContent}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal={true}>
      <PopoverTrigger>{pickerTrigger}</PopoverTrigger>
      <PopoverContent
        aria-label={t("Icon Picker")}
        width={popoverWidth}
        side={popoverPosition === "right" ? "right" : "bottom"}
        align={popoverPosition === "bottom-start" ? "start" : "center"}
        scrollable={false}
        shrink
      >
        {pickerContent}
      </PopoverContent>
    </Popover>
  );
};

type ContentProps = {
  open: boolean;
  activeTab: TabName;
  query: string;
  iconColor: string;
  iconInitial: string;
  panelWidth: number;
  allowDelete: boolean;
  onTabChange: (tab: string) => void;
  onQueryChange: (query: string) => void;
  onIconChange: (icon: string) => void;
  onIconColorChange: (color: string) => void;
  onIconRemove: () => void;
};

const Content = ({
  open,
  activeTab,
  iconColor,
  iconInitial,
  query,
  panelWidth,
  allowDelete,
  onTabChange,
  onQueryChange,
  onIconChange,
  onIconColorChange,
  onIconRemove,
}: ContentProps) => {
  const { t } = useTranslation();

  return (
    <Tabs.Root value={activeTab} onValueChange={onTabChange}>
      <TabActionsWrapper justify="space-between" align="center">
        <Tabs.List>
          <StyledTab
            value={TAB_NAMES["Icon"]}
            aria-label={t("Icons")}
            $active={activeTab === TAB_NAMES["Icon"]}
          >
            {t("Icons")}
          </StyledTab>
          <StyledTab
            value={TAB_NAMES["Emoji"]}
            aria-label={t("Emojis")}
            $active={activeTab === TAB_NAMES["Emoji"]}
          >
            {t("Emojis")}
          </StyledTab>
        </Tabs.List>
        {allowDelete && (
          <RemoveButton onClick={onIconRemove}>{t("Remove")}</RemoveButton>
        )}
      </TabActionsWrapper>
      <StyledTabContent value={TAB_NAMES["Icon"]}>
        <IconPanel
          panelWidth={panelWidth}
          initial={iconInitial}
          color={iconColor}
          query={query}
          panelActive={open && activeTab === TAB_NAMES["Icon"]}
          onIconChange={onIconChange}
          onColorChange={onIconColorChange}
          onQueryChange={onQueryChange}
        />
      </StyledTabContent>
      <StyledTabContent value={TAB_NAMES["Emoji"]}>
        <EmojiPanel
          panelWidth={panelWidth}
          query={query}
          panelActive={open && activeTab === TAB_NAMES["Emoji"]}
          onEmojiChange={onIconChange}
          onQueryChange={onQueryChange}
        />
      </StyledTabContent>
    </Tabs.Root>
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

export default React.memo(IconPicker);
