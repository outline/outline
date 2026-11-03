import { DoneIcon, InfoIcon, StarredIcon, WarningIcon } from "outline-icons";
import styled from "styled-components";
import { NoticeTypes } from "@shared/editor/nodes/Notice";
import { s } from "@shared/styles";

interface Props {
  /** The style of the notice. */
  type: NoticeTypes;
}

/**
 * Renders the icon for a notice style, colored to match the notice in the editor.
 *
 * @param props the component props.
 * @returns the icon element.
 */
export function NoticeIcon({ type }: Props) {
  switch (type) {
    case NoticeTypes.Success:
      return <SuccessIcon />;
    case NoticeTypes.Warning:
      return <NoticeWarningIcon />;
    case NoticeTypes.Tip:
      return <TipIcon />;
    default:
      return <NoticeInfoIcon />;
  }
}

const NoticeInfoIcon = styled(InfoIcon)`
  color: ${s("noticeInfoText")};
`;

const SuccessIcon = styled(DoneIcon)`
  color: ${s("noticeSuccessText")};
`;

const NoticeWarningIcon = styled(WarningIcon)`
  color: ${s("noticeWarningText")};
`;

const TipIcon = styled(StarredIcon)`
  color: ${s("noticeTipText")};
`;
