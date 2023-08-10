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
  onChange: (emoji: string | null) => void;
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

function EmojiPicker({ value, onChange, ...pickerOptions }: Props) {
  const { t } = useTranslation();
  const pickerTheme = usePickerTheme();
  const theme = useTheme();
  const language = useUserLocale();
  const locale = language && locales[language] ? locales[language] : "en";

  const popover = usePopoverState({
    placement: "bottom-start",
    modal: true,
  });

  const pickerRef = React.useRef<HTMLDivElement>(null);

  const handleEmojiChange = (emoji: any) => {
    popover.hide();
    emoji ? onChange(emoji.native) : onChange(null);
  };

  return (
    <>
      <PopoverDisclosure {...popover} onClick={(e) => e.stopPropagation()}>
        {(props) => (
          <EmojiButton size={32} {...props}>
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
        baseId="emoji-picker"
        tabIndex={0}
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
            perLine={
              // 28 is picker's observed width when perLine is set to 0
              // and 36 is the default emojiButtonSize
              // Ref: https://github.com/missive/emoji-mart#options--props
              popover.visible && pickerRef.current
                ? Math.floor((pickerRef.current.clientWidth - 28) / 36)
                : 9
            }
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
