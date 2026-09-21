import { Trans } from "react-i18next";
import styled from "styled-components";
import Flex from "../../components/Flex";
import { s } from "../../styles";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";
import type { AttachmentPreviewProps } from "../lib/attachmentPreview/types";
import { Preview, Subtitle, Title } from "./Widget";

/**
 * Placeholder shown for attachment types that have a registered preview
 * provider but no viewer implementation yet. Renders the file details in the
 * same frame a real preview would occupy.
 */
export default function UnsupportedPreview(props: AttachmentPreviewProps) {
  const { isSelected } = props;

  return (
    <Wrapper
      contentEditable={false}
      className={isSelected ? "ProseMirror-selectednode" : undefined}
    >
      <Flex gap={6} align="center">
        {props.icon}
        <Preview>
          <Title>{props.title}</Title>
          <Subtitle>{props.context}</Subtitle>
        </Preview>
      </Flex>
      <Message>
        <Trans>Preview is not available for this file type yet</Trans>
      </Message>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  background: ${s("background")};
  box-shadow: 0 0 0 1px ${s("divider")};
  border-radius: ${EditorStyleHelper.blockRadius};
  padding: ${EditorStyleHelper.blockRadius};
  user-select: none;
`;

const Message = styled.p`
  margin: 8px 0 0;
  font-size: 13px;
  color: ${s("textTertiary")};
`;
