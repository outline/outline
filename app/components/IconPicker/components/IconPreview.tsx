import { startCase } from "es-toolkit/compat";
import styled from "styled-components";
import { s } from "@shared/styles";
import { IconType } from "@shared/types";
import { IconLibrary } from "@shared/utils/IconLibrary";
import { CustomEmoji } from "@shared/components/CustomEmoji";
import { Emoji } from "~/components/Emoji";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import type { IconNode } from "./GridTemplate";

/** Height of the preview bar, used to size the grid above it. */
export const PREVIEW_HEIGHT = 56;

const GLYPH_SIZE = 28;

type Props = {
  /** The icon or emoji to preview, nothing is rendered when empty */
  icon?: IconNode;
  /** Whether the grid above has content below the fold, fades the last row */
  showFade?: boolean;
};

/**
 * Displays a large preview of the hovered icon or emoji alongside its name and
 * shortcode.
 */
export const IconPreview = ({ icon, showFade }: Props) => (
  <Container align="center" gap={12} $showFade={showFade}>
    {icon && (
      <>
        <Glyph justify="center" align="center">
          {icon.type === IconType.SVG ? (
            <Icon
              as={IconLibrary.getComponent(icon.name)}
              color={icon.color}
              size={GLYPH_SIZE}
            >
              {icon.initial}
            </Icon>
          ) : (
            <Emoji size={GLYPH_SIZE}>
              {icon.type === IconType.Custom ? (
                <CustomEmoji value={icon.value} title={icon.name} />
              ) : (
                icon.value
              )}
            </Emoji>
          )}
        </Glyph>
        <Labels column>
          <Name weight="bold" ellipsis>
            {displayName(icon)}
          </Name>
          <Text type="tertiary" size="xsmall" monospace ellipsis>
            :{shortcode(icon)}:
          </Text>
        </Labels>
      </>
    )}
  </Container>
);

const displayName = (icon: IconNode) =>
  icon.type === IconType.SVG
    ? startCase(icon.name)
    : startCase(icon.name ?? "");

const shortcode = (icon: IconNode) => {
  if (icon.type === IconType.SVG) {
    return icon.name;
  }
  return icon.type === IconType.Custom ? (icon.name ?? icon.value) : icon.id;
};

const Container = styled(Flex)<{ $showFade?: boolean }>`
  position: relative;
  flex-shrink: 0;
  height: ${PREVIEW_HEIGHT}px;
  padding: 0 16px;
  background: ${s("menuBackground")};

  // Offsets the bottom padding of the containing popover.
  margin-bottom: -6px;

  // Fades out the last row of the grid while there's more to scroll.
  &:before {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: 100%;
    height: 24px;
    pointer-events: none;
    opacity: ${({ $showFade }) => ($showFade ? 1 : 0)};
    transition: opacity 150ms ease-in-out;
    background: linear-gradient(to bottom, transparent, ${s("menuBackground")});
  }
`;

const Name = styled(Text)`
  font-size: 15px;
`;

const Glyph = styled(Flex)`
  width: ${GLYPH_SIZE}px;
  height: ${GLYPH_SIZE}px;
  flex-shrink: 0;
`;

const Labels = styled(Flex)`
  min-width: 0;
`;

const Icon = styled.svg`
  flex-shrink: 0;
`;
