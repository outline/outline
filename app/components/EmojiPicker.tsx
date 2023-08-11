import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { SmileyIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { usePopoverState, PopoverDisclosure } from "reakit/Popover";
import styled, { useTheme } from "styled-components";
import { depths, s } from "@shared/styles";
import { hexToRgb } from "@shared/utils/color";
import Button from "~/components/Button";
import Popover from "~/components/Popover";
import usePickerTheme from "~/hooks/usePickerTheme";
import useUserLocale from "~/hooks/useUserLocale";
import { hover } from "~/styles";
import Emoji from "./Emoji";
import NudeButton from "./NudeButton";

type Props = {
  value?: string | null;
  onChange: (emoji: string | null) => Promise<void>;
  onClickOutside: () => void;
};

const locales = {
  cs_CZ: "cs",
  de_DE: "de",
  en_US: "en",
  es_ES: "es",
  fa_IR: "fa",
  fr_FR: "fr",
  it_IT: "it",
  ja_JP: "ja",
  ko_KR: "kr",
  nl_NL: "nl",
  pt_BR: "pt",
  pt_PT: "pt",
  pl_PL: "pl",
  tr_TR: "tr",
  vi_VN: "vi",
  zh_CN: "zh",
  zh_TW: "zh",
};

const DEFAULT_EMOJIS_PER_LINE = 9;

function EmojiPicker({
  value,
  onChange,
  onClickOutside,
  ...pickerOptions
}: Props) {
  const { t } = useTranslation();
  const pickerTheme = usePickerTheme();
  const theme = useTheme();
  const language = useUserLocale();
  const locale = language && locales[language] ? locales[language] : "en";

  const popover = usePopoverState({
    placement: "bottom-start",
    modal: true,
  });

  const [emojisPerLine, setEmojisPerLine] = React.useState(
    DEFAULT_EMOJIS_PER_LINE
  );

  const pickerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (popover.visible && pickerRef.current) {
      // 28 is picker's observed width when perLine is set to 0
      // and 36 is the default emojiButtonSize
      // Ref: https://github.com/missive/emoji-mart#options--props
      setEmojisPerLine(Math.floor((pickerRef.current.clientWidth - 28) / 36));
    }
  }, [popover.visible]);

  const handleEmojiChange = React.useCallback(
    async (emoji) => {
      popover.hide();
      const val = emoji ? emoji.native : null;
      await onChange(val);
    },
    [popover, onChange]
  );

  const handleClick = React.useCallback(
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

  const handleClickOutside = React.useCallback(() => {
    // It was observed that onClickOutside got triggered
    // even when the picker wasn't open or opened at all.
    // Hence, this guard here...
    if (popover.visible) {
      onClickOutside();
    }
  }, [popover.visible, onClickOutside]);

  return (
    <>
      <PopoverDisclosure {...popover}>
        {(props) => (
          <EmojiButton size={32} {...props} onClick={handleClick}>
            {value ? (
              <Emoji size="24px" native={value} />
            ) : (
              <AnimatedEmoji size={32} color={theme.textTertiary} />
            )}
          </EmojiButton>
        )}
      </PopoverDisclosure>
      <PickerPopover
        {...popover}
        tabIndex={0}
        // This prevents picker from closing when any of its
        // children are focused, e.g, clicking on search bar or
        // a click on skin tone button
        onClick={(e) => e.stopPropagation()}
        width={352}
        aria-label={t("Emoji Picker")}
      >
        {value && (
          <RemoveButton neutral onClick={() => handleEmojiChange(null)}>
            {t("Remove")}
          </RemoveButton>
        )}
        <PickerStyles ref={pickerRef}>
          <Picker
            locale={locale}
            data={data}
            onEmojiSelect={handleEmojiChange}
            theme={pickerTheme}
            previewPosition="none"
            perLine={emojisPerLine}
            onClickOutside={handleClickOutside}
            {...pickerOptions}
          />
        </PickerStyles>
      </PickerPopover>
    </>
  );
}

const PlaceholderEmoji = styled(SmileyIcon)`
  margin-top: 2px;
  margin-left: -4px;
`;

export const AnimatedEmoji = styled(PlaceholderEmoji)`
  flex-shrink: 0;

  &: ${hover} {
    transition: all 100ms ease-in-out;
    transform: scale(1.1);
  }
  &:active {
    transform: scale(0.95);
  }

  @media print {
    display: none;
  }
`;

export const EmojiButton = styled(NudeButton)`
  position: absolute;
  top: 6px;
  left: -36px;
  z-index: 2;
  width: 36px;
  display: flex;
  align-items: center;
  &[aria-expanded="true"] {
    ${AnimatedEmoji} {
      opacity: 1;
      border: 0;
      border-radius: 4px;
      box-shadow: ${(props) =>
        `rgba(0, 0, 0, 0.07) 0px 1px 2px, ${props.theme.buttonNeutralBorder} 0 0 0 1px inset`};
    }
  }
`;

const RemoveButton = styled(Button)`
  margin-left: -12px;
  margin-bottom: 8px;
  border-radius: 16px;
  height: 24px;
  font-size: 12px;
  > :first-child {
    min-height: unset;
    line-height: unset;
  }
`;

const PickerPopover = styled(Popover)`
  z-index: ${depths.popover};
  > :first-child {
    padding-top: 8px;
    padding-bottom: 0;
    max-height: 488px;
    overflow: unset;
  }
`;

const PickerStyles = styled.div`
  margin-left: -24px;
  margin-right: -24px;
  em-emoji-picker {
    --shadow: none;
    --border-radius: 0;
    --font-family: ${s("fontFamily")};
    --rgb-background: ${(props) => hexToRgb(props.theme.menuBackground)};
    --border-radius: 6px;
    margin-left: auto;
    margin-right: auto;
    min-height: 443px;
  }
`;

export default EmojiPicker;
