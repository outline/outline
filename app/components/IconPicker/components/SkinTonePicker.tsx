import { useMemo, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s, hover } from "@shared/styles";
import { EmojiSkinTone } from "@shared/types";
import { getEmojiVariants } from "@shared/utils/emoji";
import { Emoji } from "~/components/Emoji";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/primitives/Popover";
import { IconButton } from "./IconButton";

const SkinTonePicker = ({
  skinTone,
  onChange,
}: {
  skinTone: EmojiSkinTone;
  onChange: (skin: EmojiSkinTone) => void;
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const handEmojiVariants = useMemo(() => getEmojiVariants({ id: "hand" }), []);

  const handleSkinClick = useCallback(
    (emojiSkin: EmojiSkinTone) => {
      setOpen(false);
      onChange(emojiSkin);
    },
    [onChange]
  );

  const menuItems = useMemo(
    () =>
      Object.values(EmojiSkinTone)
        .map((skinTone) => {
          const emoji = handEmojiVariants[skinTone];
          return emoji ? (
            <IconButton
              key={emoji.value}
              onClick={() => handleSkinClick(skinTone)}
            >
              <Emoji width={24} height={24}>
                {emoji.value}
              </Emoji>
            </IconButton>
          ) : null;
        })
        .filter(Boolean),
    [handEmojiVariants, handleSkinClick]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <StyledMenuButton aria-label={t("Choose default skin tone")}>
          {handEmojiVariants[skinTone]?.value}
        </StyledMenuButton>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        aria-label={t("Choose default skin tone")}
        width={208}
        scrollable={false}
        shrink
      >
        <Emojis>{menuItems}</Emojis>
      </PopoverContent>
    </Popover>
  );
};

const Emojis = styled(Flex)`
  padding: 0 8px;
`;

const StyledMenuButton = styled(NudeButton)`
  width: 32px;
  height: 32px;
  border: 1px solid ${s("inputBorder")};
  padding: 4px;

  &: ${hover} {
    border: 1px solid ${s("inputBorderFocused")};
  }
`;

export default SkinTonePicker;
