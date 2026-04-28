import { CloseIcon } from "outline-icons";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";
import styled from "styled-components";
import { ellipsis } from "@shared/styles";
import { useDocumentContext } from "~/components/DocumentContext";
import Tooltip from "~/components/Tooltip";

export function SearchHighlightChip() {
  const { t } = useTranslation();
  const { editor } = useDocumentContext();
  const history = useHistory();
  const location = useLocation();
  const searchHighlight = new URLSearchParams(location.search).get("q");

  const handleClick = useCallback(() => {
    editor?.commands.clearSearch();
    const params = new URLSearchParams(location.search);
    params.delete("q");
    const search = params.toString();
    history.replace({
      pathname: location.pathname,
      search: search ? `?${search}` : "",
      hash: location.hash,
      state: location.state,
    });
  }, [editor, history, location]);

  if (!searchHighlight) {
    return null;
  }

  return (
    <Tooltip
      content={t("Clear search highlight")}
      shortcut="Esc"
      placement="bottom"
    >
      <Chip
        type="button"
        onClick={handleClick}
        aria-label={t("Clear search highlight")}
      >
        <Label>{searchHighlight}</Label>
        <CloseIcon size={16} />
      </Chip>
    </Tooltip>
  );
}

const Chip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: 28px;
  padding: 0 6px 0 10px;
  margin: 0 4px;
  background: rgba(255, 213, 0, 0.25);
  color: ${(props) => props.theme.text};
  border: 0;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 500;
  line-height: 1;
  cursor: var(--pointer);
  user-select: none;
  max-width: 200px;

  &:hover {
    background: rgba(255, 213, 0, 0.5);
  }

  & > svg {
    flex-shrink: 0;
  }
`;

const Label = styled.span`
  ${ellipsis()}
  line-height: 1.5;
`;
