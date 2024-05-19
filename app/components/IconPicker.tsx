import * as React from "react";
import { useTranslation } from "react-i18next";
import { PopoverDisclosure, usePopoverState } from "reakit";
import { MenuItem } from "reakit/Menu";
import styled, { useTheme } from "styled-components";
import { IconLibrary } from "@shared/utils/IconLibrary";
import { colorPalette } from "@shared/utils/collections";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";
import Text from "~/components/Text";
import useOnClickOutside from "~/hooks/useOnClickOutside";
import lazyWithRetry from "~/utils/lazyWithRetry";
import DelayedMount from "./DelayedMount";
import InputSearch from "./InputSearch";
import Popover from "./Popover";

const icons = IconLibrary.mapping;

const TwitterPicker = lazyWithRetry(
  () => import("react-color/lib/components/twitter/Twitter")
);

type Props = {
  onOpen?: () => void;
  onClose?: () => void;
  onChange: (color: string, icon: string) => void;
  initial: string;
  icon: string;
  color: string;
  className?: string;
};

function IconPicker({
  onOpen,
  onClose,
  icon,
  initial,
  color,
  onChange,
  className,
}: Props) {
  const [query, setQuery] = React.useState("");
  const { t } = useTranslation();
  const theme = useTheme();
  const popover = usePopoverState({
    gutter: 0,
    placement: "right",
    modal: true,
  });

  React.useEffect(() => {
    if (popover.visible) {
      onOpen?.();
    } else {
      onClose?.();
      setQuery("");
    }
  }, [onOpen, onClose, popover.visible]);

  const filteredIcons = IconLibrary.findIcons(query);
  const handleFilter = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value.toLowerCase());
  };

  const styles = React.useMemo(
    () => ({
      default: {
        body: {
          padding: 0,
          marginRight: -8,
        },
        hash: {
          color: theme.text,
          background: theme.inputBorder,
        },
        swatch: {
          cursor: "var(--cursor-pointer)",
        },
        input: {
          color: theme.text,
          boxShadow: `inset 0 0 0 1px ${theme.inputBorder}`,
          background: "transparent",
        },
      },
    }),
    [theme]
  );

  // Custom click outside handling rather than using `hideOnClickOutside` from reakit so that we can
  // prevent event bubbling.
  useOnClickOutside(
    popover.unstable_popoverRef,
    (event) => {
      if (popover.visible) {
        event.stopPropagation();
        event.preventDefault();
        popover.hide();
      }
    },
    { capture: true }
  );

  const iconNames = Object.keys(icons);
  const delayPerIcon = 250 / iconNames.length;

  return (
    <>
      <PopoverDisclosure {...popover}>
        {(props) => (
          <NudeButton
            aria-label={t("Show menu")}
            className={className}
            {...props}
          >
            <Icon
              as={IconLibrary.getComponent(icon || "collection")}
              color={color}
            >
              {initial}
            </Icon>
          </NudeButton>
        )}
      </PopoverDisclosure>
      <Popover
        {...popover}
        width={552}
        aria-label={t("Choose an icon")}
        hideOnClickOutside={false}
      >
        <Flex column gap={12}>
          <Text size="large" weight="xbold">
            {t("Choose an icon")}
          </Text>
          <InputSearch
            value={query}
            placeholder={`${t("Filter")}…`}
            onChange={handleFilter}
            autoFocus
          />
          <div>
            {iconNames.map((name, index) => (
              <MenuItem key={name} onClick={() => onChange(color, name)}>
                {(props) => (
                  <IconButton
                    style={
                      {
                        opacity: query
                          ? filteredIcons.includes(name)
                            ? 1
                            : 0.3
                          : undefined,
                        "--delay": `${Math.round(index * delayPerIcon)}ms`,
                      } as React.CSSProperties
                    }
                    {...props}
                  >
                    <Icon
                      as={IconLibrary.getComponent(name)}
                      color={color}
                      size={30}
                    >
                      {initial}
                    </Icon>
                  </IconButton>
                )}
              </MenuItem>
            ))}
          </div>
          <Flex>
            <React.Suspense
              fallback={
                <DelayedMount>
                  <Text>{t("Loading")}…</Text>
                </DelayedMount>
              }
            >
              <ColorPicker
                color={color}
                onChange={(color) => onChange(color.hex, icon)}
                colors={colorPalette}
                triangle="hide"
                styles={styles}
              />
            </React.Suspense>
          </Flex>
        </Flex>
      </Popover>
    </>
  );
}

const Icon = styled.svg`
  transition: color 150ms ease-in-out, fill 150ms ease-in-out;
  transition-delay: var(--delay);
`;

const IconButton = styled(NudeButton)`
  vertical-align: top;
  border-radius: 4px;
  margin: 0px 6px 6px 0px;
  width: 30px;
  height: 30px;
`;

const ColorPicker = styled(TwitterPicker)`
  box-shadow: none !important;
  background: transparent !important;
  width: 100% !important;
`;

export default IconPicker;
