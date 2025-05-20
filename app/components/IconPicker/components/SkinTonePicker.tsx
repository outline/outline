import { useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Menu, MenuButton, MenuItem, useMenuState } from "reakit";
import styled from "styled-components";
import { depths, s, hover } from "@shared/styles";
import { EmojiSkinTone } from "@shared/types";
import { getEmojiVariants } from "@shared/utils/emoji";
import { Emoji } from "~/components/Emoji";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";
import { IconButton } from "./IconButton";

const SkinTonePicker = ({
  skinTone,
  onChange,
}: {
  skinTone: EmojiSkinTone;
  onChange: (skin: EmojiSkinTone) => void;
}) => {
  const { t } = useTranslation();

  const handEmojiVariants = useMemo(() => getEmojiVariants({ id: "hand" }), []);

  const menu = useMenuState({
    placement: "bottom-end",
  });

  const handleSkinClick = useCallback(
    (emojiSkin) => {
      menu.hide();
      onChange(emojiSkin);
    },
    [menu, onChange]
  );

  const menuItems = useMemo(
    () =>
      Object.entries(handEmojiVariants).map(([eskin, emoji]) => (
        <MenuItem {...menu} key={emoji.value}>
          {(menuprops) => (
            <IconButton {...menuprops} onClick={() => handleSkinClick(eskin)}>
              <Emoji width={24} height={24}>
                {emoji.value}
              </Emoji>
            </IconButton>
          )}
        </MenuItem>
      )),
    [menu, handEmojiVariants, handleSkinClick]
  );

  return (
    <>
      <MenuButton {...menu}>
        {(props) => (
          <StyledMenuButton
            {...props}
            aria-label={t("Choose default skin tone")}
          >
            {handEmojiVariants[skinTone]!.value}
          </StyledMenuButton>
        )}
      </MenuButton>
      <Menu {...menu} aria-label={t("Choose default skin tone")}>
        {(props) => <MenuContainer {...props}>{menuItems}</MenuContainer>}
      </Menu>
    </>
  );
};

const MenuContainer = styled(Flex)`
  z-index: ${depths.menu};
  padding: 4px;
  border-radius: 4px;
  background: ${s("menuBackground")};
  box-shadow: ${s("menuShadow")};
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
