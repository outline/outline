import * as React from "react";
import { useTranslation } from "react-i18next";
import { PopoverDisclosure, usePopoverState } from "reakit";
import { MenuItem } from "reakit/Menu";
import styled, { useTheme } from "styled-components";
import { colorPalette } from "@shared/utils/collections";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";
import Text from "~/components/Text";
import useOnClickOutside from "~/hooks/useOnClickOutside";
import lazyWithRetry from "~/utils/lazyWithRetry";
import DelayedMount from "./DelayedMount";
import { IconLibrary } from "./Icons/IconLibrary";
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
  const { t } = useTranslation();
  const theme = useTheme();
  const popover = usePopoverState({
    gutter: 0,
    placement: "bottom",
    modal: true,
  });

  React.useEffect(() => {
    if (popover.visible) {
      onOpen?.();
    } else {
      onClose?.();
    }
  }, [onOpen, onClose, popover.visible]);

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
        width={388}
        aria-label={t("Choose icon")}
        hideOnClickOutside={false}
      >
        <Icons>
          {Object.keys(icons).map((name, index) => (
            <MenuItem key={name} onClick={() => onChange(color, name)}>
              {(props) => (
                <IconButton
                  style={
                    {
                      "--delay": `${index * 8}ms`,
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
        </Icons>
        <Colors>
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
        </Colors>
      </Popover>
    </>
  );
}

const Icon = styled.svg`
  transition: fill 150ms ease-in-out;
  transition-delay: var(--delay);
`;

const Colors = styled(Flex)`
  padding: 8px;
`;

const Icons = styled.div`
  padding: 8px;
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
